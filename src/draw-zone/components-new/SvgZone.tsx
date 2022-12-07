import React, { useCallback, useEffect, useRef } from 'react'
import SvgElements from './SvgElements'
import { CIRCLE_BORDER_SIZE, CIRCLE_SIZE, xns } from '../constants'
import type {
    DrawZoneElement,
    DrawZoneMode,
    DrawZoneShape,
    Point,
} from '../types'
import {
    ArrayXY,
    Circle,
    PointArrayAlias,
    Polygon,
    Polyline,
    Rect,
    SVG,
    Svg,
    ViewBoxLike,
} from '@svgdotjs/svg.js'
import { getSVGPoint, unSelectElement, zoom } from '../utils'
import { uuid4 } from '../../helpers'
import { useControls } from '../hooks'
import { isTouchDevice } from '../../utils'

export type SvgZoneProps = {
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
}
export default function SvgZone({
    disabled,
    drawOnPointerDown,
    elements,
    initialRect,
    mode,
    shape,
    src,
    onChange,
    onInitialRectChange,
}: SvgZoneProps) {
    const {
        contentHidden,
        move,
        viewBox,
        imageSize: size,
        setViewBox,
    } = useControls()
    const svgRef = useRef<SVGSVGElement>(null)
    const groupRef = useRef<SVGGElement>(null)
    const imageRef = useRef<SVGImageElement>(null)

    const scale = useRef(viewBox.width / size.width)

    const startPosition = useRef<Point>()
    const dragging = useRef<boolean>(false)
    const overlayRect = useRef<Rect>()
    const overlayRect2 = useRef<Rect>()
    const polyPoints = useRef<Circle[]>()
    const polygon = useRef<Polygon>()
    const polyline = useRef<Polyline>()
    const eventCache = useRef<Array<PointerEvent>>([])
    const multiTouchEvent = useRef<boolean>(false)

    console.log('PSYC--RENDER', contentHidden, move, viewBox, size)

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
                x: x,
                y: y,
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
        [elements, onChange],
    )

    const drawPoint = useCallback(
        function drawPoint(svg: Svg, x: number, y: number): Circle {
            const delta = CIRCLE_SIZE / 2

            const point = svg
                .circle(CIRCLE_SIZE)
                .center(0, 0)
                .fill({ opacity: 1, color: '#f06' })
                .stroke({
                    width: CIRCLE_BORDER_SIZE,
                    color: '#fff',
                    opacity: 0.3,
                })
                .attr('data-draw-ignore', true)
                .addClass('tmp-point')
                .move(x - delta, y - delta)
                .css('touch-action', 'none') // silence interactjs warning.

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

    // TODO: Chenge ref source, merge with other useEffect
    /*
    useEffect(() => {
        const { current } = svgRef

        if (!current) return

        const svg = SVG(current) as Svg

        function onPointerDown(e: globalThis.PointerEvent) {
            if (!svg.node.contains(e.target as Node)) return

            if (contentHidden) return

            if (
                svg.node.contains(e.target as Node) &&
                svg.node !== e.target &&
                !move &&
                !startPosition.current
            ) {
                return
            } else if (e.target === svg.node) {
                e.preventDefault()
                e.stopImmediatePropagation()

                unselectElements()
            }

            if (mode !== 'draw' || disabled) return

            if (move) {
                e.preventDefault()
                e.stopImmediatePropagation()

                startPosition.current = {
                    x: e.clientX,
                    y: e.clientY,
                }

                dragging.current = true

                svg.css({ cursor: 'grabbing' })

                return
            }

            const svgRect = svg.node.getBoundingClientRect()

            if (shape === 'rect') {
                e.preventDefault()
                e.stopImmediatePropagation()

                startPosition.current = {
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                }

                if (!overlayRect.current || !overlayRect2.current) {
                    overlayRect.current = svg
                        .rect(0, 0)
                        .fill({ opacity: 0 })
                        .stroke({
                            color: '#000',
                            width: 2,
                            opacity: 0.7,
                            dasharray: '5,5',
                        })
                    overlayRect2.current = svg
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
                    startPosition.current.x / svgRect.width,
                    startPosition.current.y / svgRect.height,
                )

                overlayRect2.current.move(
                    startPosition.current.x / svgRect.width,
                    startPosition.current.y / svgRect.height,
                )

                e.preventDefault()
            }

            if (shape === 'poly') {
                e.preventDefault()
                e.stopImmediatePropagation()

                if (!polyPoints.current?.length) {
                    startPosition.current = {
                        x: e.clientX - svgRect.left,
                        y: e.clientY - svgRect.top,
                    }

                    polyPoints.current = [
                        drawPoint(
                            svg,
                            startPosition.current.x,
                            startPosition.current.y,
                        ),
                    ]
                } else if (startPosition.current) {
                    const currentPosition = {
                        x: e.clientX - svgRect.left,
                        y: e.clientY - svgRect.top,
                    }

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
                            x: x,
                            y: y,
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

                        polygon.current = svg
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
                                svg,
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
                if (!svg.node.contains(e.target as Node)) {
                    dragging.current = false
                    return
                }

                const currentPosition = {
                    x: e.clientX,
                    y: e.clientY,
                }
                const translationX = currentPosition.x - startPosition.current.x
                const translationY = currentPosition.y - startPosition.current.y

                const matrix = current.getScreenCTM()

                setViewBox((prev) => ({
                    x: prev.x - translationX / matrix.a,
                    y: prev.y - translationY / matrix.d,
                }))

                startPosition.current = currentPosition

                e.preventDefault()
                e.stopImmediatePropagation()

                return
            }

            const svgRect = svg.node.getBoundingClientRect()

            if (
                shape === 'rect' &&
                overlayRect.current &&
                overlayRect2.current
            ) {
                const currentPosition = {
                    x:
                        Math.max(
                            Math.min(e.clientX, svgRect.right),
                            svgRect.left,
                        ) - svgRect.left,
                    y:
                        Math.max(
                            Math.min(e.clientY, svgRect.bottom),
                            svgRect.top,
                        ) - svgRect.top,
                }

                const minX =
                    Math.min(startPosition.current.x, currentPosition.x) /
                    svgRect.width
                const minY =
                    Math.min(startPosition.current.y, currentPosition.y) /
                    svgRect.height
                const maxX =
                    Math.max(startPosition.current.x, currentPosition.x) /
                    svgRect.width
                const maxY =
                    Math.max(startPosition.current.y, currentPosition.y) /
                    svgRect.height

                const width = Math.abs(maxX - minX)
                const height = Math.abs(maxY - minY)

                overlayRect.current.move(`${minX * 100}%`, `${minY * 100}%`)
                overlayRect.current.width(`${width * 100}%`)
                overlayRect.current.height(`${height * 100}%`)
                overlayRect2.current.move(`${minX * 100}%`, `${minY * 100}%`)
                overlayRect2.current.width(`${width * 100}%`)
                overlayRect2.current.height(`${height * 100}%`)
            }

            if (shape === 'poly' && !isTouchDevice) {
                const svgRect = svg.node.getBoundingClientRect()

                const currentPosition: Point = {
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                }

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

                polyline.current = svg.polyline(plotline).fill('none').stroke({
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

                const currentPosition = {
                    x: e.clientX,
                    y: e.clientY,
                }
                const translationX = currentPosition.x - startPosition.current.x
                const translationY = currentPosition.y - startPosition.current.y

                const matrix = current.getScreenCTM()

                setViewBox((prev) => ({
                    x: prev.x - translationX / matrix.a,
                    y: prev.y - translationY / matrix.d,
                }))

                svg.css({ cursor: 'grab' })

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
                if ((e.target as Node | null)?.parentNode === svg.node) {
                    startPosition.current = undefined
                    return
                }

                const svgRect = svg.node.getBoundingClientRect()
                const currentPosition = {
                    x:
                        Math.max(
                            Math.min(e.clientX, svgRect.right),
                            svgRect.left,
                        ) - svgRect.left,
                    y:
                        Math.max(
                            Math.min(e.clientY, svgRect.bottom),
                            svgRect.top,
                        ) - svgRect.top,
                }

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
                        currentPosition.x = Math.min(
                            startPosition.current.x + lastRect.rect.width,
                            svgRect.width,
                        )
                        currentPosition.y = Math.min(
                            startPosition.current.y + lastRect.rect.height,
                            svgRect.height,
                        )
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
        setViewBox,
        shape,
        unselectElements,
    ])
    */

    useEffect(() => {
        const svg = svgRef.current
        const group = groupRef.current
        const image = imageRef.current

        const $svg = SVG(svg)
        const $group = SVG(group)
        const $image = SVG(image)

        let hypo = undefined

        function getCacheIndex(event: PointerEvent) {
            return eventCache.current.findIndex(
                (cached) => cached.pointerId === event.pointerId,
            )
        }

        function onWheelHandler(event: WheelEvent) {
            const delta = event.deltaY || event.detail || 0
            const normalized = -(delta % 3 ? delta * 10 : delta / 3)
            const zoomKind = normalized > 0 ? 'zoomIn' : 'zoomOut'

            const startPoint = getSVGPoint(
                event.clientX,
                event.clientY,
                svg.getScreenCTM().inverse(),
            )

            setViewBox((prev) => {
                const older = prev as ViewBoxLike

                const viewBox = zoom(zoomKind, startPoint, older)

                scale.current = viewBox.width / size.width

                return viewBox
            })
        }

        function onTouchStart(event: TouchEvent) {
            if (event.touches.length === 2) {
                multiTouchEvent.current = true
            }
        }

        function onTouchEnd(event: TouchEvent) {
            if (event.touches.length === 2) {
                multiTouchEvent.current = false
            }
        }

        function onPointerDownHandler(event: PointerEvent) {
            console.log('PSYC--POINTER-DOWN', event)
            eventCache.current.push(event)

            if (multiTouchEvent.current) return
            console.log('PSYC--POINTER-DOWN-SIGNLE-TOUCH')

            if (!svg.contains(event.target as Node)) return
            console.log('PSYC--POINTER-DOWN-SIGNLE-CONTAINS-NODE')

            if (contentHidden) return

            if (
                svg.contains(event.target as Node) &&
                group !== event.target &&
                image !== event.target &&
                !move &&
                !startPosition.current
            ) {
                return
            } else if (event.target === image) {
                event.preventDefault()
                event.stopImmediatePropagation()

                unselectElements()
            }

            if (mode !== 'draw' || disabled) return

            if (move) {
                event.preventDefault()
                event.stopImmediatePropagation()

                startPosition.current = getSVGPoint(
                    event.clientX,
                    event.clientY,
                    svg.getScreenCTM().inverse(),
                )

                dragging.current = true

                $svg.css({ cursor: 'grbbing' })

                return
            }

            if (shape === 'rect') {
                console.log('PSYC--POINTER-DOWN-RECT')
                event.preventDefault()
                event.stopImmediatePropagation()

                startPosition.current = getSVGPoint(
                    event.clientX,
                    event.clientY,
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
            }

            if (shape === 'poly') {
                event.preventDefault()
                event.stopImmediatePropagation()

                if (!polyPoints.current?.length) {
                    startPosition.current = getSVGPoint(
                        event.clientX,
                        event.clientY,
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
                        event.clientX,
                        event.clientY,
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
                        if (polyPoints.current?.length) {
                            polyPoints.current.forEach((p) => p.remove())
                            polyPoints.current = undefined
                        }

                        if (polyline.current) {
                            polyline.current.remove()
                            polyline.current = undefined
                        }

                        startPosition.current = undefined

                        const points = prev.map(([x, y]) => ({
                            x,
                            y,
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

        function onPointerMoveHandler(event: PointerEvent) {
            if (event.defaultPrevented) return

            if (multiTouchEvent.current) {
                const index = getCacheIndex(event)
                eventCache.current[index] = event

                if (index === 1) {
                    const midPoint: Point = {
                        x:
                            (eventCache.current[0].clientX +
                                eventCache.current[1].clientX) /
                            2,
                        y:
                            (eventCache.current[0].clientY +
                                eventCache.current[1].clientY) /
                            2,
                    }
                    const hypo1 = Math.hypot(
                        eventCache.current[0].clientX -
                            eventCache.current[1].clientX,
                        eventCache.current[0].clientY -
                            eventCache.current[1].clientY,
                    )

                    const startPoint = getSVGPoint(
                        midPoint.x,
                        midPoint.y,
                        svg.getScreenCTM().inverse(),
                    )

                    const newScale = hypo
                        ? (scale.current * hypo1) / hypo
                        : scale.current
                    const increment = Math.abs(
                        1 - (newScale - scale.current) / scale.current,
                    )

                    setViewBox((prev) => {
                        const older = prev as ViewBoxLike

                        const viewBox = zoom(increment, startPoint, older)

                        scale.current = viewBox.width / size.width

                        return viewBox
                    })

                    hypo = hypo1
                }

                return
            }
            if (!startPosition.current) return

            if (mode !== 'draw' || disabled) return

            if (move) {
                if (!dragging.current) return
                if (!svg.contains(event.target as Node)) {
                    dragging.current = false
                    return
                }

                event.preventDefault()
                event.stopImmediatePropagation()

                const currentPosition = getSVGPoint(
                    event.clientX,
                    event.clientY,
                    svg.getScreenCTM().inverse(),
                )

                const translationX = currentPosition.x - startPosition.current.x
                const translationY = currentPosition.y - startPosition.current.y

                setViewBox((prev) => ({
                    x: prev.x - translationX,
                    y: prev.y - translationY,
                }))

                startPosition.current = currentPosition

                return
            }

            if (
                shape === 'rect' &&
                overlayRect.current &&
                overlayRect2.current
            ) {
                const currentPosition = getSVGPoint(
                    event.clientX,
                    event.clientY,
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
                overlayRect.current.height(height)
                overlayRect.current.width(width)
                /*
                overlayRect2.current.move(minX, minY)
                overlayRect2.current.width(width)
                overlayRect2.current.height(height)
                */
            }

            if (shape === 'poly' && !isTouchDevice) {
                const currentPosition = getSVGPoint(
                    event.clientX,
                    event.clientY,
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

        function onPointerUpHandler(event: PointerEvent) {
            const index = eventCache.current.findIndex(
                (cachedEv) => cachedEv.pointerId === event.pointerId,
            )
            eventCache.current.splice(index, 1)
            hypo = undefined

            if (event.defaultPrevented) return

            if (move) {
                if (!dragging.current) return false

                const currentPosition = getSVGPoint(
                    event.clientX,
                    event.clientY,
                    svg.getScreenCTM().inverse(),
                )
                const translationX = currentPosition.x - startPosition.current.x
                const translationY = currentPosition.y - startPosition.current.y

                setViewBox((prev) => ({
                    x: prev.x - translationX,
                    y: prev.y - translationY,
                }))

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
                if ((event.target as Node | null)?.parentNode === group) {
                    startPosition.current = undefined
                    return
                }

                const currentPosition = getSVGPoint(
                    event.clientX,
                    event.clientY,
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
                        currentPosition.x =
                            startPosition.current.x + lastRect.rect.width
                        currentPosition.y =
                            startPosition.current.y + lastRect.rect.height
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

        svg.addEventListener('wheel', onWheelHandler, { passive: true })
        svg.addEventListener('touchstart', onTouchStart, false)
        svg.addEventListener('touchend', onTouchEnd)
        svg.addEventListener('touchcancel', onTouchEnd)
        svg.addEventListener('pointerdown', onPointerDownHandler)
        window.addEventListener('pointermove', onPointerMoveHandler)
        window.addEventListener('pointerup', onPointerUpHandler)
        window.addEventListener('pointercancel', onPointerUpHandler)
        window.addEventListener('pointerout', onPointerUpHandler)
        window.addEventListener('pointerleave', onPointerUpHandler)

        return () => {
            svg.removeEventListener('wheel', onWheelHandler)
            svg.removeEventListener('touchstart', onTouchStart, false)
            svg.removeEventListener('touchend', onTouchEnd)
            svg.removeEventListener('touchcancel', onTouchEnd)
            svg.removeEventListener('pointerdown', onPointerDownHandler)
            window.removeEventListener('pointermove', onPointerMoveHandler)
            window.removeEventListener('pointerup', onPointerUpHandler)
            window.removeEventListener('pointercancel', onPointerUpHandler)
            window.removeEventListener('pointerout', onPointerUpHandler)
            window.removeEventListener('pointerleave', onPointerUpHandler)
        }
    }, [
        contentHidden,
        disabled,
        drawOnPointerDown,
        drawPoint,
        elements,
        initialRect,
        localOnInitialRectChange,
        mode,
        move,
        onChange,
        setViewBox,
        shape,
        size.width,
        unselectElements,
    ])

    return (
        <svg
            ref={svgRef}
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink={xns}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        >
            <g
                ref={groupRef}
                transform={`rotate(0, ${size.width / 2}, ${size.height / 2})`} // TODO: Later, add rotation
            >
                <image
                    ref={imageRef}
                    href={src}
                    x="0"
                    y="0"
                    height={size.height}
                    width={size.width}
                />
                <SvgElements
                    disabled={disabled}
                    elements={elements}
                    mode={mode}
                    shape={shape}
                    onChange={onChange}
                />
            </g>
        </svg>
    )
}
