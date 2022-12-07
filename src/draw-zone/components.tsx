import React, {
    PropsWithChildren,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useId, usePointerPosition, useSetState } from '../hooks'
import { DRAW_ZONE_INITIAL_STATE } from './constants'
import { useControls, useLoadImage } from './hooks'
import { DrawZoneContext } from './state'
import {
    DrawZoneElement,
    DrawZoneMode,
    DrawZoneShape,
    DrawZoneState,
    PictureLoadingState,
    Point,
    Size,
} from './types'
import interact from 'interactjs'
import {
    ArrayXY,
    Circle,
    PointArrayAlias,
    Polygon,
    Polyline,
    Rect,
    SVG,
    Svg,
    Use,
} from '@svgdotjs/svg.js'
import { bgrToHex, clamp, uuid4 } from '../helpers'
import { isTouchDevice } from '../utils'

import { Interactable } from '@interactjs/types'
import { getSVGPoint } from './utils'

const xns = 'http://www.w3.org/1999/xlink'
const CIRCLE_SIZE = 10
const CIRCLE_BORDER_SIZE = (isTouchDevice ? 47 : 11) - CIRCLE_SIZE
const blue = '#2BB1FD'

const preventDrag = (event: DragEvent) => {
    event.preventDefault()
}

export function DrawZoneContainer({ children }: PropsWithChildren<unknown>) {
    const [state, setState] = useSetState<DrawZoneState>({
        ...DRAW_ZONE_INITIAL_STATE,
    })
    return (
        <DrawZoneContext.Provider value={{ state, setState }}>
            {children}
        </DrawZoneContext.Provider>
    )
}

type DrawZoneProps = PropsWithChildren<{
    readonly disabled?: boolean
    readonly drawOnPointerDown?: boolean
    readonly elements: DrawZoneElement[]
    readonly initialRect?: Pick<DrawZoneElement, 'id' | 'label' | 'rect'>
    readonly mode: DrawZoneMode
    readonly shape: DrawZoneShape
    readonly src: string
    readonly onChange: (elements: DrawZoneElement[]) => void
    readonly onInitialRectChange?: (
        arg: Pick<DrawZoneElement, 'id' | 'label' | 'rect'>,
    ) => void
    readonly style?: React.CSSProperties
}>
export default function DrawZone({ children, src, ...props }: DrawZoneProps) {
    const { status, pictureSize } = useLoadImage(src)

    if (status === PictureLoadingState.Error)
        throw new Error('Failed to load image')

    if (status !== PictureLoadingState.Done) return null

    return (
        <DrawZoneInner pictureSize={pictureSize} src={src} {...props}>
            {children}
        </DrawZoneInner>
    )
}

function filterPoints(shape: DrawZoneShape) {
    return function filter(_: Point, index: number, arr: Point[]): boolean {
        if (arr.length === 2) return true

        return shape === 'poly' || index % 2 === 0
    }
}

type DrawZoneInnerProps = DrawZoneProps & {
    readonly pictureSize: Size
}
function DrawZoneInner({
    children,
    disabled,
    drawOnPointerDown,
    elements,
    initialRect,
    mode,
    pictureSize,
    shape,
    src,
    style,
    onChange,
    onInitialRectChange,
}: DrawZoneInnerProps) {
    const { contentHidden, markerVisible } = useControls()
    const svgContainerRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [canMarkerBeVisible, setCanMarkerBeVisible] = useState(false)

    useEffect(() => {
        const { current } = containerRef

        const handlePointerEnter = () => {
            setCanMarkerBeVisible(true)
        }
        const handlePointerLeave = () => {
            setCanMarkerBeVisible(false)
        }

        current.addEventListener('pointerenter', handlePointerEnter)
        current.addEventListener('pointerleave', handlePointerLeave)

        return () => {
            current.removeEventListener('pointerenter', handlePointerEnter)
            current.removeEventListener('pointerleave', handlePointerLeave)
        }
    }, [])

    const localOnChange = useCallback(
        (elements: DrawZoneElement[]) => {
            if (contentHidden) return

            onChange(
                elements.map((element) => {
                    const points = element.points.map(({ x, y }) => ({
                        x: clamp(Math.round(x), 0, pictureSize.width),
                        y: clamp(Math.round(y), 0, pictureSize.height),
                    }))
                    const minX = Math.min(...points.map(({ x }) => x))
                    const minY = Math.min(...points.map(({ y }) => y))
                    const maxX = Math.max(...points.map(({ x }) => x))
                    const maxY = Math.max(...points.map(({ y }) => y))

                    const rect: DrawZoneElement['rect'] = {
                        height: maxY - minY,
                        width: maxX - minX,
                        x: minX,
                        y: minY,
                    }

                    return {
                        ...element,
                        rect,
                        points: points.filter(filterPoints(shape)),
                    }
                }),
            )
        },
        [contentHidden, onChange, shape, pictureSize],
    )

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
                pointerEvents: 'auto',
                touchAction: 'none',
                userSelect: 'none',
            }}
            ref={containerRef}
        >
            {canMarkerBeVisible && markerVisible && (
                <Marker src={src} svgRef={svgContainerRef} />
            )}
            {pictureSize && (
                <SvgZone
                    disabled={disabled}
                    drawOnPointerDown={drawOnPointerDown}
                    elements={contentHidden ? [] : elements}
                    initialRect={initialRect}
                    mode={mode}
                    shape={shape}
                    onChange={localOnChange}
                    onInitialRectChange={onInitialRectChange}
                    src={src}
                    pictureSize={pictureSize}
                />
            )}
            {children}
        </div>
    )
}

type SvgZoneProps = {
    readonly disabled?: boolean
    readonly drawOnPointerDown?: boolean
    readonly elements: DrawZoneElement[]
    readonly initialRect?: Pick<DrawZoneElement, 'id' | 'label' | 'rect'>
    readonly mode: DrawZoneMode
    readonly pictureSize: Size
    readonly shape: DrawZoneShape
    readonly src: string
    readonly onChange: (elements: DrawZoneElement[]) => void
    readonly onInitialRectChange?: (
        arg: Pick<DrawZoneElement, 'id' | 'label' | 'rect'>,
    ) => void
}
function SvgZone({
    disabled,
    drawOnPointerDown,
    elements,
    initialRect,
    mode,
    pictureSize,
    shape,
    src,
    onChange,
    onInitialRectChange,
}: SvgZoneProps) {
    const id = useId()
    const svgRef = useRef<SVGSVGElement>(null)
    const groupRef = useRef<SVGGElement>(null)
    const imageRef = useRef<SVGImageElement>(null)

    const startPosition = useRef<Point>()
    const dragging = useRef<boolean>(false)
    const overlayRect = useRef<Rect>()
    const overlayRect2 = useRef<Rect>()
    const polyPoints = useRef<Circle[]>()
    const polygon = useRef<Polygon>()
    const polyline = useRef<Polyline>()
    const { contentHidden, move, scale, setPosition } = useControls()

    const activeElement = useMemo(
        () => elements.find(({ selected }) => selected),
        [elements],
    )

    const localOnInitialRectChange = useCallback(
        (elem: Pick<DrawZoneElement, 'id' | 'label' | 'rect'>) => {
            if (onInitialRectChange) {
                onInitialRectChange({
                    ...elem,
                    rect: {
                        height: Math.round(elem.rect.height),
                        width: Math.round(elem.rect.width),
                        x: Math.round(elem.rect.x),
                        y: Math.round(elem.rect.y),
                    },
                })
            }
        },
        [onInitialRectChange],
    )

    const unselectElements = useCallback(() => {
        onChange(elements.map(unSelectElement))
    }, [elements, onChange])

    const pointOnPointerDown = useCallback(
        (event: Event) => {
            if (!polygon.current) return

            event.preventDefault()
            event.stopPropagation()

            const plot = polygon.current.plot()

            if (plot.length < 3) return

            polygon.current.remove()
            polygon.current = undefined

            if (polyPoints.current && polyPoints.current.length > 0) {
                polyPoints.current.forEach((p) => p.remove())
                polyPoints.current = undefined
            }

            polyline.current?.remove()
            polyline.current = undefined

            startPosition.current = undefined

            const points = plot.map(([x, y]) => ({
                x: x / scale,
                y: y / scale,
            }))

            const xList = points.map(({ x }) => x)
            const yList = points.map(({ y }) => y)

            const xMin = Math.min(...xList)
            const yMin = Math.min(...yList)
            const xMax = Math.max(...xList)
            const yMax = Math.max(...yList)

            const newElement: DrawZoneElement = {
                id: uuid4(),
                label: '',
                points,
                rect: {
                    height: yMax - yMin,
                    width: xMax - xMin,
                    x: xMin,
                    y: yMin,
                },
                selected: true,
            }

            onChange([...elements.map(unSelectElement), newElement])
        },
        [elements, onChange, scale],
    )

    const drawPoint = useCallback(
        function drawPoint(svg: Svg, x: number, y: number): Circle {
            const delta = CIRCLE_SIZE / 2

            const point = svg
                .circle(`${CIRCLE_SIZE}px`)
                .center(0, 0)
                .fill({ opacity: 1, color: '#f06' })
                .stroke({
                    color: '#fff',
                    opacity: 0.3,
                })
                .attr('data-draw-ignore', true)
                .attr('stroke-width', `${CIRCLE_BORDER_SIZE}px`)
                .attr('vector-effect', 'non-scaling-stroke')
                .addClass('tmp-point')
                .move(x - delta, y - delta)
                .css({
                    touchAction: 'none', // silence interactjs warning.
                })

            point.on('pointerdown', pointOnPointerDown)

            return point
        },
        [pointOnPointerDown],
    )

    useEffect(() => {
        const { current } = svgRef

        if (!current) return

        const svg = SVG(current) as Svg

        if (move) {
            svg.css({ cursor: 'grab' })
        } else {
            svg.css({ cursor: 'default' })
        }
    }, [move])

    useEffect(() => {
        const svg = svgRef.current
        const group = groupRef.current
        const image = imageRef.current

        const $svg = SVG(svg)

        function onPointerDown(e: globalThis.PointerEvent) {
            if (!svg.contains(e.target as Node)) return

            if (contentHidden) return

            if (
                svg.contains(e.target as Node) &&
                group !== e.target &&
                image !== e.target &&
                !move &&
                !startPosition.current
            ) {
                return
            } else if (e.target === image) {
                e.preventDefault()
                e.stopImmediatePropagation()

                unselectElements()
            }

            if (mode !== 'draw' || disabled) return

            if (move) {
                e.preventDefault()
                e.stopImmediatePropagation()

                startPosition.current = getSVGPoint(
                    e.clientX,
                    e.clientY,
                    svg.getScreenCTM().inverse(),
                )

                dragging.current = true

                $svg.css({ cursor: 'grabbing' })

                return
            }

            if (shape === 'rect') {
                e.preventDefault()
                e.stopImmediatePropagation()

                startPosition.current = getSVGPoint(
                    e.clientX,
                    e.clientY,
                    svg.getScreenCTM().inverse(),
                )

                if (!overlayRect.current || !overlayRect2.current) {
                    overlayRect.current = $svg
                        .rect(0, 0)
                        .fill({ opacity: 0 })
                        .stroke({
                            color: '#000',
                            width: 2,
                            opacity: 0.7,
                            dasharray: '5,5',
                        })
                    overlayRect2.current = $svg
                        .rect(0, 0)
                        .fill({ opacity: 0 })
                        .stroke({
                            color: '#fff',
                            width: 2,
                            opacity: 0.7,
                            dasharray: '5,5',
                            dashoffset: 5,
                        })
                }

                overlayRect.current.move(
                    startPosition.current.x,
                    startPosition.current.y,
                )

                overlayRect2.current.move(
                    startPosition.current.x,
                    startPosition.current.y,
                )

                e.preventDefault()
            }

            if (shape === 'poly') {
                e.preventDefault()
                e.stopImmediatePropagation()

                if (!polyPoints.current?.length) {
                    startPosition.current = getSVGPoint(
                        e.clientX,
                        e.clientY,
                        svg.getScreenCTM().inverse(),
                    )

                    polyPoints.current = [
                        drawPoint(
                            $svg,
                            startPosition.current.x,
                            startPosition.current.y,
                        ),
                    ]
                } else if (startPosition.current) {
                    const currentPosition = getSVGPoint(
                        e.clientX,
                        e.clientY,
                        svg.getScreenCTM().inverse(),
                    )

                    const prev = polygon.current
                        ? [...polygon.current.plot()]
                        : [
                              [
                                  startPosition.current.x,
                                  startPosition.current.y,
                              ] as ArrayXY,
                          ]

                    polygon.current?.remove()
                    polygon.current = undefined

                    const start = prev[0]
                    if (
                        prev.length > 2 &&
                        Math.abs(currentPosition.x - start[0]) <= 10 &&
                        Math.abs(currentPosition.y - start[1]) <= 10
                    ) {
                        if (
                            polyPoints.current &&
                            polyPoints.current.length > 0
                        ) {
                            polyPoints.current.forEach((p) => p.remove())
                            polyPoints.current = undefined
                        }

                        if (polyline.current) {
                            polyline.current.remove()
                            polyline.current = undefined
                        }

                        startPosition.current = undefined

                        const points = prev.map(([x, y]) => ({
                            x: x / scale,
                            y: y / scale,
                        }))

                        const xList = points.map(({ x }) => x)
                        const yList = points.map(({ y }) => y)

                        const xMin = Math.min(...xList)
                        const yMin = Math.min(...yList)
                        const xMax = Math.max(...xList)
                        const yMax = Math.max(...yList)

                        const newElement: DrawZoneElement = {
                            id: uuid4(),
                            label: '',
                            points,
                            rect: {
                                height: yMax - yMin,
                                width: xMax - xMin,
                                x: xMin,
                                y: yMin,
                            },
                            selected: true,
                        }

                        onChange([...elements.map(unSelectElement), newElement])
                    } else {
                        const plotline: PointArrayAlias = [
                            ...prev,
                            [currentPosition.x, currentPosition.y],
                        ]

                        polygon.current = $svg
                            .polyline(plotline)
                            .fill({
                                color: '#f06',
                                opacity: 0,
                            })
                            .stroke({
                                color: '#f06',
                                width: 1,
                                linecap: 'round',
                                linejoin: 'round',
                            })
                            .attr('data-draw-ignore', true)

                        polyPoints.current.push(
                            drawPoint(
                                $svg,
                                currentPosition.x,
                                currentPosition.y,
                            ),
                        )

                        polyPoints.current.forEach((p) => p.front())

                        startPosition.current = currentPosition
                    }
                }
            }
        }

        function onPointerMove(this: Window, e: globalThis.PointerEvent) {
            if (e.defaultPrevented || !startPosition.current) return

            if (mode !== 'draw' || disabled) return

            if (move) {
                if (!dragging.current) return
                if (!$svg.node.contains(e.target as Node)) {
                    dragging.current = false
                    return
                }

                const parent = $svg.parent()

                if (!parent) return

                const currentPosition = getSVGPoint(
                    e.clientX,
                    e.clientY,
                    svg.getScreenCTM().inverse(),
                )
                const translationX = currentPosition.x - startPosition.current.x
                const translationY = currentPosition.y - startPosition.current.y

                parent.css(
                    'transform',
                    `translate3d(${translationX}px, ${translationY}px, 0px)`,
                )

                e.preventDefault()
                e.stopImmediatePropagation()

                return
            }

            if (
                shape === 'rect' &&
                overlayRect.current &&
                overlayRect2.current
            ) {
                const currentPosition = getSVGPoint(
                    e.clientX,
                    e.clientY,
                    svg.getScreenCTM().inverse(),
                )

                const minX = Math.min(
                    startPosition.current.x,
                    currentPosition.x,
                )
                const minY = Math.min(
                    startPosition.current.y,
                    currentPosition.y,
                )
                const maxX = Math.max(
                    startPosition.current.x,
                    currentPosition.x,
                )
                const maxY = Math.max(
                    startPosition.current.y,
                    currentPosition.y,
                )

                const width = Math.abs(maxX - minX)
                const height = Math.abs(maxY - minY)

                overlayRect.current.move(minX, minY)
                overlayRect.current.width(width)
                overlayRect.current.height(height)
                overlayRect2.current.move(minX, minY)
                overlayRect2.current.width(width)
                overlayRect2.current.height(height)
            }

            if (shape === 'poly' && !isTouchDevice) {
                const currentPosition = getSVGPoint(
                    e.clientX,
                    e.clientY,
                    svg.getScreenCTM().inverse(),
                )

                polyline.current?.remove()

                const prev = polygon.current
                    ? [...polygon.current.plot()]
                    : [
                          [
                              startPosition.current.x,
                              startPosition.current.y,
                          ] as ArrayXY,
                      ]

                const plotline: PointArrayAlias = [
                    ...prev,
                    [currentPosition.x, currentPosition.y],
                ]

                polyline.current = $svg.polyline(plotline).fill('none').stroke({
                    color: '#f06',
                    width: 1,
                    linecap: 'round',
                    linejoin: 'round',
                    dasharray: '5,5',
                })

                if (Array.isArray(polyPoints.current)) {
                    polyPoints.current.forEach((p) => p.front())
                }
            }
        }

        function onPointerUp(this: Window, e: globalThis.PointerEvent) {
            if (e.defaultPrevented) return

            if (move) {
                if (!dragging.current) return false

                const parent = $svg.parent()

                if (!parent) return
                const grandParent = parent.parent()

                if (!grandParent) return

                const parentRect = grandParent.node.getBoundingClientRect()
                const svgRect = parent.node.getBoundingClientRect()

                setPosition(
                    svgRect.top - parentRect.top,
                    svgRect.left - parentRect.left,
                )

                $svg.css({ cursor: 'grab' })

                dragging.current = false
                startPosition.current = undefined

                return
            }

            if (mode === 'draw' && shape === 'rect' && !disabled) {
                if (!startPosition.current) return

                if (overlayRect.current || overlayRect2.current) {
                    overlayRect.current?.remove()
                    overlayRect.current = undefined
                    overlayRect2.current?.remove()
                    overlayRect2.current = undefined
                }

                // Prevent drawing new rect on rect dragend...
                if ((e.target as Node | null)?.parentNode === $svg.node) {
                    startPosition.current = undefined
                    return
                }

                const currentPosition = getSVGPoint(
                    e.clientX,
                    e.clientY,
                    svg.getScreenCTM().inverse(),
                )

                let label = ''
                if (
                    Math.abs(currentPosition.x - startPosition.current.x) <= 2
                ) {
                    let lastRect: Pick<
                        DrawZoneElement,
                        'id' | 'label' | 'rect'
                    > = elements[elements.length - 1]

                    if (initialRect) {
                        lastRect = initialRect
                    }

                    label = lastRect?.label

                    if (drawOnPointerDown && lastRect && lastRect.rect) {
                        currentPosition.x = startPosition.current.x
                        currentPosition.y = startPosition.current.y
                    } else {
                        startPosition.current = undefined
                        return
                    }
                }

                const xMin = Math.min(
                    startPosition.current.x,
                    currentPosition.x,
                )
                const yMin = Math.min(
                    startPosition.current.y,
                    currentPosition.y,
                )
                const xMax = Math.max(
                    startPosition.current.x,
                    currentPosition.x,
                )
                const yMax = Math.max(
                    startPosition.current.y,
                    currentPosition.y,
                )

                const width = xMax - xMin
                const height = yMax - yMin

                const newElement: DrawZoneElement = {
                    id: uuid4(),
                    label,
                    points: [
                        {
                            x: xMin,
                            y: yMin,
                        },
                        {
                            x: xMax,
                            y: yMax,
                        },
                    ],
                    rect: {
                        height,
                        width,
                        x: xMin,
                        y: yMin,
                    },
                    selected: true,
                }

                localOnInitialRectChange({
                    rect: newElement.rect,
                    label: newElement.label,
                    id: newElement.id,
                })

                onChange([...elements.map(unSelectElement), newElement])
            }

            if (mode !== 'draw' || (mode === 'draw' && shape !== 'poly'))
                startPosition.current = undefined
        }

        $svg.on('pointerdown', onPointerDown as unknown as EventListener)
        window.addEventListener('pointerup', onPointerUp)
        window.addEventListener('pointermove', onPointerMove)

        return () => {
            $svg.off('pointerdown', onPointerDown as unknown as EventListener)
            window.removeEventListener('pointerup', onPointerUp)
            window.removeEventListener('pointermove', onPointerMove)
        }
    }, [
        contentHidden,
        disabled,
        drawOnPointerDown,
        drawPoint,
        elements,
        initialRect,
        mode,
        move,
        onChange,
        localOnInitialRectChange,
        scale,
        setPosition,
        shape,
        unselectElements,
    ])

    return (
        <svg
            ref={svgRef}
            id={id}
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink={xns}
            viewBox={`0 0 ${pictureSize.width} ${pictureSize.height}`}
        >
            <g ref={groupRef}>
                <image
                    ref={imageRef}
                    href={src}
                    x="0"
                    y="0"
                    height={pictureSize.height}
                    width={pictureSize.width}
                />
                <SvgElements
                    disabled={disabled}
                    elements={elements}
                    mode={mode}
                    shape={shape}
                    onChange={onChange}
                />
                <polyline />
                <HandlesElements shape={shape} activeElement={activeElement} />
            </g>
        </svg>
    )
}

type HandlesElementsProps = {
    readonly activeElement: DrawZoneElement | null
    readonly shape: DrawZoneShape
}
function HandlesElements({ activeElement, shape }: HandlesElementsProps) {
    const points = useMemo(() => {
        if (!activeElement?.points) return null

        if (shape === 'poly') return activeElement.points

        return [
            {
                x: activeElement.points[0].x,
                y: activeElement.points[0].y,
            },
            {
                x: activeElement.points[0].x,
                y: activeElement.points[1].y,
            },
            {
                x: activeElement.points[1].x,
                y: activeElement.points[1].y,
            },
            {
                x: activeElement.points[1].x,
                y: activeElement.points[0].y,
            },
        ]
    }, [activeElement, shape])
    if (!points) return null

    return (
        <>
            {points.map((p) => (
                <Handle key={`${p.x}-${p.y}`} point={p} />
            ))}
        </>
    )
}

type HandleProps = {
    readonly point: Point
}
function Handle({ point }: HandleProps) {
    const id = useId()

    return <circle cx={point.x} cy={point.y} r="20" />
}

type SvgElementsProps = {
    readonly disabled?: boolean
    readonly elements: DrawZoneElement[]
    readonly mode: DrawZoneMode
    readonly shape: DrawZoneShape
    readonly onChange: (elements: DrawZoneElement[]) => void
}
function SvgElements({
    disabled,
    elements,
    mode,
    shape,
    onChange,
}: SvgElementsProps) {
    return (
        <>
            {shape !== 'none' &&
                elements.map((element) => (
                    <DrawElement
                        key={element.id}
                        disabled={disabled}
                        elements={elements}
                        element={element}
                        mode={mode}
                        shape={shape}
                        onChange={onChange}
                    />
                ))}
        </>
    )
}

type DrawElementProps = {
    readonly disabled?: boolean
    readonly element: DrawZoneElement
    readonly elements: DrawZoneElement[]
    readonly mode: DrawZoneMode
    readonly shape: DrawZoneShape
    readonly onChange: (elements: DrawZoneElement[]) => void
}
function DrawElement({
    disabled,
    element,
    elements,
    mode,
    shape,
    onChange,
}: DrawElementProps) {
    if (element.points?.length === 2) {
        return (
            <DrawRectElement
                disabled={disabled}
                element={element}
                elements={elements}
                mode={mode}
                onChange={onChange}
            />
        )
    }

    return (
        <DrawPolygonElement
            disabled={disabled}
            element={element}
            elements={elements}
            mode={mode}
            shape={shape}
            onChange={onChange}
        />
    )
}

type DrawRectElementProps = {
    readonly disabled?: boolean
    readonly element: DrawZoneElement
    readonly elements: DrawZoneElement[]
    readonly mode: DrawZoneMode
    readonly onChange: (elements: DrawZoneElement[]) => void
}
function DrawRectElement({
    disabled,
    element,
    elements,
    mode,
    onChange,
}: DrawRectElementProps) {
    const minX = useMemo(
        () => Math.min(element.points[0].x, element.points[1].x),
        [element.points],
    )
    const minY = useMemo(
        () => Math.min(element.points[0].y, element.points[1].y),
        [element.points],
    )
    const maxX = useMemo(
        () => Math.max(element.points[0].x, element.points[1].x),
        [element.points],
    )
    const maxY = useMemo(
        () => Math.max(element.points[0].y, element.points[1].y),
        [element.points],
    )

    const newPoints: Point[] = useMemo(
        () => [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY },
        ],
        [maxX, maxY, minX, minY],
    )

    const newElement = useMemo(
        () => ({
            ...element,
            points: newPoints,
        }),
        [element, newPoints],
    )

    return (
        <DrawPolygonElement
            disabled={disabled}
            element={newElement}
            elements={elements}
            mode={mode}
            shape="rect"
            onChange={onChange}
        />
    )
}

type DrawPolygonElementProps = {
    readonly disabled?: boolean
    readonly element: DrawZoneElement
    readonly elements: DrawZoneElement[]
    readonly mode: DrawZoneMode
    readonly shape: DrawZoneShape
    readonly onChange: (elements: DrawZoneElement[]) => void
}
function DrawPolygonElement({
    disabled,
    element,
    elements,
    mode,
    shape,
    onChange,
}: DrawPolygonElementProps) {
    const ref = useRef<SVGPolygonElement>(null)
    const { move } = useControls()
    const instance = useRef<Interactable>()
    const handlesInstance = useRef<Interactable>()
    const handles = useRef<Use[]>([])
    const circles = useRef<Circle[]>([])

    const path = element.points
        .map((point) => [point.x, point.y].join(','))
        .join(' ')

    const cleanHandles = useCallback(() => {
        handlesInstance.current?.unset()
        handlesInstance.current = undefined

        handles.current.forEach((h) => h.remove())
        handles.current.length = 0

        circles.current.forEach((h) => h.remove())
        circles.current.length = 0

        document.removeEventListener('dragstart', preventDrag)
    }, [])

    const makeHandlesGrabbable = useCallback(() => {
        const { current } = ref

        if (!current) return

        const parent = current.parentNode as SVGGElement
        const grandParent = parent.parentNode as SVGSVGElement
        const svg = (grandParent as unknown as Record<string, Svg>).instance
        const rootMatrix = parent.getScreenCTM().inverse() as DOMMatrix

        handlesInstance.current?.unset()

        handlesInstance.current = interact('.point-handle')
            .draggable({
                onstart: function (event) {
                    svg.css('cursor', 'grabbing')
                    event.target.instance.css('cursor', 'grabbing')
                },
                onmove: function (event) {
                    const i = event.target.getAttribute('data-index') | 0
                    const point = current.points.getItem(i)

                    point.x += event.dx * rootMatrix.a
                    point.y += event.dy * rootMatrix.d

                    if (shape === 'rect') {
                        switch (i) {
                            case 0: // top left
                                handles.current[0].x(point.x)
                                handles.current[0].y(point.y)
                                handles.current[1].y(point.y)
                                handles.current[3].x(point.x)
                                break
                            case 1: // top right
                                handles.current[1].x(point.x)
                                handles.current[1].y(point.y)
                                handles.current[2].x(point.x)
                                handles.current[0].y(point.y)
                                break
                            case 2: // bottom right
                                handles.current[2].x(point.x)
                                handles.current[2].y(point.y)
                                handles.current[3].y(point.y)
                                handles.current[1].x(point.x)
                                break
                            case 3: // bottom left
                                handles.current[3].x(point.x)
                                handles.current[3].y(point.y)
                                handles.current[0].x(point.x)
                                handles.current[2].y(point.y)
                                break
                        }

                        const newPlot = handles.current.map(
                            (h) => [Number(h.x()), Number(h.y())] as ArrayXY,
                        )

                        const pointsCount = current.points.numberOfItems
                        for (let i = 0; i < pointsCount; i++) {
                            const point = current.points.getItem(i)

                            point.x = newPlot[i][0]
                            point.y = newPlot[i][1]
                        }
                    } else {
                        event.target.x.baseVal.value = point.x
                        event.target.y.baseVal.value = point.y
                    }
                },
                onend: function (event) {
                    event.target.instance.css('cursor', 'grab')
                    svg.css('cursor', 'crosshair')

                    svg.node.setAttribute('class', '')

                    const pointsCount = current.points.numberOfItems
                    const points = new Array<Point>()

                    for (let i = 0; i < pointsCount; i++) {
                        const point = current.points.getItem(i)

                        points.push({
                            x: point.x,
                            y: point.y,
                        })
                    }

                    const index = elements.findIndex(
                        (elem) => elem.id === element.id,
                    )
                    const newElements = [
                        ...elements.slice(0, index).map(unSelectElement),
                        {
                            ...element,
                            points: points,
                            selected: true,
                        },
                        ...elements.slice(index + 1).map(unSelectElement),
                    ]

                    onChange(newElements)
                },
                modifiers: [
                    interact.modifiers.restrict({
                        restriction: 'parent',
                    }),
                ],
            })
            .styleCursor(false)
    }, [element, elements, onChange, shape])

    const createHandles = useCallback(() => {
        const { current } = ref

        if (!current) return

        const svg = (
            current.parentNode.parentNode as unknown as Record<string, Svg>
        ).instance

        for (let i = 0; i < current.points.numberOfItems; i++) {
            const point = current.points.getItem(i)

            const handleId = `point-handle-${i}`

            const circle = svg
                .defs()
                .circle(`${CIRCLE_SIZE}px`)
                .center(0, 0)
                .fill({ opacity: 1, color: blue })
                .stroke({
                    color: '#fff',
                    opacity: 0.3,
                })
                .attr('stroke-width', `${CIRCLE_BORDER_SIZE}px`)
                .attr('vector-effect', 'non-scaling-size')
                .addClass('tmp-point')
                .css('touch-action', 'none') // silence interactjs warning.
                .id(handleId)

            const handle = svg
                .use(circle as Circle)
                .attr('href', `#${handleId}`, xns)
                .addClass('point-handle')
                .attr('vector-effect', 'non-scaling-size')
                .x(point.x)
                .y(point.y)
                .data('index', i)

            handle
                .on('mousedown', function mousedown(event) {
                    event.preventDefault()
                    event.stopPropagation()
                })
                .css('cursor', 'grab')

            circles.current.push(circle)
            handles.current.push(handle)
        }

        makeHandlesGrabbable()

        document.addEventListener('dragstart', preventDrag)
    }, [makeHandlesGrabbable])

    const setupInteract = useCallback(() => {
        const { current } = ref
        if (!current) return

        if (mode !== 'draw') return

        createHandles()

        const parent = current.parentNode.parentNode as SVGSVGElement
        const rootMatrix = parent.getScreenCTM().inverse() as DOMMatrix

        instance.current = interact(current as SVGPolygonElement).draggable({
            listeners: {
                start() {
                    cleanHandles()
                },
                move(event) {
                    const dx = event.dx * rootMatrix.a
                    const dy = event.dy * rootMatrix.d

                    const pointsCount = current.points.numberOfItems
                    for (let i = 0; i < pointsCount; i++) {
                        const point = current.points.getItem(i)

                        point.x = point.x + dx
                        point.y = point.y + dy
                    }
                },
                end() {
                    createHandles()
                    const pointsCount = current.points.numberOfItems
                    const points = new Array<Point>()

                    for (let i = 0; i < pointsCount; i++) {
                        const point = current.points.getItem(i)

                        points.push({
                            x: point.x,
                            y: point.y,
                        })
                    }

                    const index = elements.findIndex(
                        (elem) => elem.id === element.id,
                    )
                    const newElements = [
                        ...elements.slice(0, index).map(unSelectElement),
                        {
                            ...element,
                            points: points,
                            selected: true,
                        },
                        ...elements.slice(index + 1).map(unSelectElement),
                    ]

                    onChange(newElements)
                },
            },
            modifiers: [
                interact.modifiers.restrict({
                    restriction: 'parent',
                    elementRect: {
                        top: 0,
                        left: 0,
                        bottom: 1,
                        right: 1,
                    },
                }),
            ],
            cursorChecker: (action, interactable, element, interacting) => {
                switch (action.axis) {
                    case 'x':
                        return 'ew-resize'
                    case 'y':
                        return 'ns-resize'
                    default:
                        return interacting ? 'grabbing' : 'move'
                }
            },
        })
    }, [cleanHandles, createHandles, element, elements, mode, onChange])

    const onPointerDown: React.PointerEventHandler<SVGPolygonElement> =
        useCallback(
            (event) => {
                if (disabled || event.defaultPrevented || move) return

                if (!element.selected) {
                    const elem = elements.find((elem) => elem.id === element.id)
                    const index = elements.findIndex((e) => e === elem)
                    const newElements = [
                        ...elements.slice(0, index).map(unSelectElement),
                        {
                            ...element,
                            selected: true,
                        },
                        ...elements.slice(index + 1).map(unSelectElement),
                    ]

                    setupInteract()

                    onChange(newElements)
                }
            },
            [disabled, element, elements, move, onChange, setupInteract],
        )

    useEffect(() => {
        if (element.selected && !move) {
            setupInteract()
        } else {
            instance.current?.unset()
            instance.current = undefined
        }

        return () => {
            cleanHandles()
        }
    }, [cleanHandles, element.selected, move, setupInteract])

    const stroke = useMemo(
        () =>
            element.selected
                ? blue
                : element.color
                ? bgrToHex(...element.color)
                : '#ffffff',
        [element.selected, element.color],
    )

    return (
        <polygon
            ref={ref}
            onPointerDown={onPointerDown}
            points={path}
            stroke={stroke}
            strokeOpacity={1}
            strokeWidth="2px"
            fillOpacity={0}
            style={{
                touchAction: 'none', // silence interactjs warning.
            }}
        />
    )
}

function unSelectElement(element: DrawZoneElement): DrawZoneElement {
    if (element.selected)
        return {
            ...element,
            selected: false,
        }

    return element
}

type MarkerProps = {
    readonly src: string | null
    readonly svgRef: React.RefObject<HTMLDivElement>
}
function Marker({ src, svgRef }: MarkerProps): JSX.Element {
    const { clientX, clientY } = usePointerPosition()

    const width = svgRef.current?.getBoundingClientRect().width
    const height = svgRef.current?.getBoundingClientRect().height
    const left = clientX - (svgRef.current?.getBoundingClientRect().left || 0)
    const top = clientY - (svgRef.current?.getBoundingClientRect().top || 0)

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    top: '0',
                    bottom: '0',
                    transform: `translate3d(${left}px, 0px, 0px)`,
                    width: '1px',
                    background: `url(${src}) ${
                        left * -1
                    }px 0% / ${width}px ${height}px, #fff`,
                    backgroundBlendMode: 'difference',
                    zIndex: 20,
                    pointerEvents: 'none',
                    touchAction: 'none',
                    willChange: 'transform, background',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    transform: `translate3d(0px, ${top}px, 0px)`,
                    right: '0',
                    left: '0',
                    height: '1px',
                    background: `url(${src}) 0% ${
                        top * -1
                    }px / ${width}px ${height}px, #fff`,
                    backgroundBlendMode: 'difference',
                    zIndex: 20,
                    pointerEvents: 'none',
                    touchAction: 'none',
                    willChange: 'transform, background',
                }}
            />
        </>
    )
}
