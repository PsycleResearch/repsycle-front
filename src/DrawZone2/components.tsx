import React, {
    PropsWithChildren,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useId, usePointerPosition, useSetState } from '../hooks'
import { MAX_SCALE, SCALE_STEP } from './constants'
import {
    useControls,
    useDrawZone2,
    useDrawZone2PrivateState,
    useLoadImage,
} from './hooks'
import {
    DrawZone2Context,
    DrawZone2ControlsContext,
    DrawZone2PrivateContext,
} from './state'
import {
    DrawZone2Mode,
    DrawZone2PrivateState,
    DrawZone2Shape,
    DrawZone2State,
    DrawZoneElement,
    DrawZoneFitMode,
    PictureLoadingState,
    Point,
} from './types'
import interact from 'interactjs'

const xns = 'http://www.w3.org/1999/xlink'

type DrawZone2Props = PropsWithChildren<{
    readonly src: string
    readonly disabled?: boolean
}>
export default function DrawZone2({ children, disabled, src }: DrawZone2Props) {
    return (
        <DrawZone2ContextProvider disabled={disabled} src={src}>
            <DrawZone2PrivateContextProvider>
                {children}
            </DrawZone2PrivateContextProvider>
        </DrawZone2ContextProvider>
    )
}

type DrawZone2ContextProviderProps = PropsWithChildren<{
    readonly disabled?: boolean
    readonly src: string
}>
function DrawZone2ContextProvider({
    children,
    disabled,
    src,
}: DrawZone2ContextProviderProps) {
    const { status, pictureSize } = useLoadImage(src)
    const [state, setState] = useSetState<DrawZone2State>({
        src,
        pictureSize,
        disabled,
    })

    useEffect(() => {
        setState({ src })
    }, [setState, src])

    useEffect(() => {
        setState({ pictureSize })
    }, [pictureSize, setState])

    if (status === PictureLoadingState.Error)
        throw new Error('Failed to load image')

    return (
        <DrawZone2Context.Provider value={state}>
            {children}
        </DrawZone2Context.Provider>
    )
}

function DrawZone2PrivateContextProvider({
    children,
}: PropsWithChildren<unknown>) {
    const [move, setMove] = useState(false)
    const [markerVisible, setMarkerVisible] = useState(false)
    const [hideContent, setHideContent] = useState(false)
    const [state, setState] = useSetState<DrawZone2PrivateState>({
        logicalScale: 1,
        positionLeft: 0,
        positionTop: 0,
        redraw: false,
        scale: 1,
    })

    const zoomIn = useCallback(() => {
        setState((prev) => ({
            logicalScale: Math.min(
                (prev.logicalScale as number) + SCALE_STEP,
                MAX_SCALE,
            ),
        }))
    }, [setState])

    const zoomOut = useCallback(() => {
        setState((prev) => ({
            logicalScale: Math.max(
                SCALE_STEP,
                (prev.logicalScale as number) - SCALE_STEP,
            ),
        }))
    }, [setState])

    const reset = useCallback(() => {
        setState({
            logicalScale: 1,
            positionTop: 0,
            positionLeft: 0,
        })
    }, [setState])

    const toggleContent = useCallback(() => {
        setHideContent((prev) => !prev)
    }, [])

    const toggleMarker = useCallback(() => {
        setMarkerVisible((prev) => !prev)
    }, [])

    const toggleMove = useCallback(() => {
        setMove((prev) => !prev)
    }, [])

    const redraw = useCallback(() => {
        setState((prev) => ({ redraw: !prev.redraw }))
    }, [setState])

    const setPosition = useCallback(
        (top: number, left: number) => {
            setState({
                positionTop: top,
                positionLeft: left,
            })
        },
        [setState],
    )

    const setScale = useCallback(
        (scale: number) => {
            setState({ scale })
        },
        [setState],
    )

    const finaleState = useMemo(
        () => ({
            ...state,
            setPosition,
            setScale,
        }),
        [setPosition, setScale, state],
    )

    return (
        <DrawZone2PrivateContext.Provider value={finaleState}>
            <DrawZone2ControlsContext.Provider
                value={{
                    contentHidden: hideContent,
                    markerVisible: markerVisible,
                    move: move,
                    redraw,
                    reset,
                    toggleContent,
                    toggleMarker,
                    toggleMove,
                    zoomIn,
                    zoomOut,
                }}
            >
                {children}
            </DrawZone2ControlsContext.Provider>
        </DrawZone2PrivateContext.Provider>
    )
}

type DrawZone2EditorProps = PropsWithChildren<{
    readonly elements: DrawZoneElement[]
    readonly fitMode: DrawZoneFitMode
    readonly mode: DrawZone2Mode
    readonly onChange: (elements: DrawZoneElement[]) => void
    readonly shape: DrawZone2Shape

    readonly drawOnMouseDown?: boolean
    readonly initialRect?: DrawZoneElement
    readonly onInitialRectChange?: (
        arg: Pick<DrawZoneElement, 'id' | 'label' | 'rect'>,
    ) => void
}>
export function DrawZone2Editor({
    children,
    elements,
    fitMode,
    mode,
    onChange,
    shape,
    drawOnMouseDown,
    initialRect,
    onInitialRectChange,
}: DrawZone2EditorProps) {
    const { src, pictureSize } = useDrawZone2()
    const { markerVisible } = useControls()
    const { positionTop, positionLeft, logicalScale, scale, setScale } =
        useDrawZone2PrivateState()
    const svgRef = useRef<SVGElement>(null)
    const svgContainerRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [canMarkerBeVisible, setCanMarkerBeVisible] = useState(false)

    useEffect(() => {
        if (fitMode === 'auto') {
            setScale(logicalScale)
        } else if (containerRef.current && pictureSize) {
            const rect = containerRef.current.getBoundingClientRect()

            const minWidth = Math.min(rect.width, pictureSize.width)
            const minHeight = Math.min(rect.height, pictureSize.height)

            if (
                pictureSize.width <= minWidth &&
                pictureSize.height <= minHeight
            ) {
                const maxWidth = Math.max(rect.width, pictureSize.width)
                const maxHeight = Math.max(rect.height, pictureSize.height)

                const coef = maxWidth / minWidth
                const coef2 = maxHeight / minHeight

                if (pictureSize.height * coef <= maxHeight) {
                    setScale(coef * logicalScale)
                } else if (pictureSize.width * coef2 <= maxWidth) {
                    setScale(coef2 * logicalScale)
                } else {
                    setScale(logicalScale)
                }
            } else if (
                minWidth < pictureSize.width ||
                minHeight < pictureSize.height
            ) {
                setScale(
                    Math.min(
                        minWidth / pictureSize.width,
                        minHeight / pictureSize.height,
                    ) * logicalScale,
                )
            }
        }
    }, [containerRef, pictureSize, fitMode, logicalScale, setScale])

    useEffect(() => {
        const { current: svg } = svgRef
        const { current } = svgContainerRef
        const { current: container } = containerRef

        if (current && container && svg) {
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
        }
    }, [])

    useEffect(() => {
        if (svgContainerRef.current) {
            svgContainerRef.current.style.top = `${positionTop}px`
            svgContainerRef.current.style.left = `${positionLeft}px`
            svgContainerRef.current.style.transform = 'none'
        }
    }, [positionTop, positionLeft])

    const localOnChange = useCallback(
        (elements: DrawZoneElement[]) => {
            onChange(
                elements.map((element) => {
                    const minX = Math.min(...element.points.map(({ x }) => x))
                    const minY = Math.min(...element.points.map(({ y }) => y))
                    const maxX = Math.max(...element.points.map(({ x }) => x))
                    const maxY = Math.max(...element.points.map(({ y }) => y))

                    const rect: DrawZoneElement['rect'] = {
                        height: maxY - minY,
                        width: maxX - minX,
                        x: minX,
                        y: minY,
                    }

                    return {
                        ...element,
                        rect,
                        points: element.points.filter(
                            (_, index) => shape === 'poly' || index % 2 === 0,
                        ),
                    }
                }),
            )
        },
        [onChange, shape],
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
            <div
                ref={svgContainerRef}
                style={{
                    top: `${positionTop}px`,
                    left: `${positionLeft}px`,
                    background: `url('${src}') center center / 100% 100% no-repeat`,
                    width: `${pictureSize?.width * scale}px`,
                    height: `${pictureSize?.height * scale}px`,
                }}
            >
                <SvgZone elements={elements} onChange={localOnChange} />
                {canMarkerBeVisible && markerVisible && (
                    <Marker src={src} svgRef={svgContainerRef} />
                )}
                {children}
            </div>
        </div>
    )
}

type SvgZoneProps = {
    readonly elements: DrawZoneElement[]
    readonly onChange: (elements: DrawZoneElement[]) => void
}
function SvgZone({ elements, onChange }: SvgZoneProps) {
    const id = useId()
    const ref = useRef<SVGSVGElement>(null)

    /*
    useEffect(() => {
        const svg = SVG(ref.current) as Svg

        console.log('PSYC--SVG', svg, ref.current)
    }, [])
    */

    return (
        <svg
            ref={ref}
            id={id}
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            xmlnsXlink={xns}
        >
            {elements.map((element) => (
                <DrawElement
                    key={element.id}
                    elements={elements}
                    element={element}
                    onChange={onChange}
                />
            ))}
        </svg>
    )
}

type DrawElementProps = {
    readonly element: DrawZoneElement
    readonly elements: DrawZoneElement[]
    readonly onChange: (elements: DrawZoneElement[]) => void
}
function DrawElement({ element, elements, onChange }: DrawElementProps) {
    if (element.points?.length === 2) {
        return (
            <DrawRectElement
                element={element}
                elements={elements}
                onChange={onChange}
            />
        )
    }

    return null
}

type DrawRectElementProps = {
    readonly element: DrawZoneElement
    readonly elements: DrawZoneElement[]
    readonly onChange: (elements: DrawZoneElement[]) => void
}
function DrawRectElement({
    element,
    elements,
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
            element={newElement}
            elements={elements}
            onChange={onChange}
        />
    )
}

type DrawPolygonElementProps = {
    readonly element: DrawZoneElement
    readonly elements: DrawZoneElement[]
    readonly onChange: (elements: DrawZoneElement[]) => void
}
function DrawPolygonElement({
    element,
    elements,
    onChange,
}: DrawPolygonElementProps) {
    const ref = useRef<SVGPolygonElement>(null)
    //const [interactInstance, setInteractInstance] = useState<Interactable>()
    const { scale } = useDrawZone2PrivateState()

    const path = element.points
        .map((point) => [point.x * scale, point.y * scale].join(','))
        .join(' ')

    const onClick = useCallback(() => {
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

            onChange(newElements)
        }
    }, [elements, element, onChange])

    useEffect(() => {
        const { current } = ref
        if (!element.selected || !current) return

        const instance = interact(ref.current as SVGPolygonElement).draggable({
            listeners: {
                start() {
                    // TODO: Remove handles
                },
                move(event) {
                    const dx = event.dx
                    const dy = event.dy

                    const pointsCount = current.points.numberOfItems
                    for (let i = 0; i < pointsCount; i++) {
                        const point = current.points.getItem(i)

                        point.x = point.x + dx
                        point.y = point.y + dy
                    }
                },
                end() {
                    // TODO: Handles
                    const pointsCount = current.points.numberOfItems
                    const points = new Array<Point>()

                    for (let i = 0; i < pointsCount; i++) {
                        const point = current.points.getItem(i)

                        points.push({
                            x: point.x / scale,
                            y: point.y / scale,
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
                        },
                        ...elements.slice(index + 1).map(unSelectElement),
                    ]

                    onChange(newElements)
                },
            },
            modifiers: [
                interact.modifiers.restrict({
                    restriction: 'parent',
                    elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
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

        return () => {
            instance.unset()
        }
    }, [element, elements, onChange, scale])

    return (
        <polygon
            ref={ref}
            onClick={onClick}
            points={path}
            stroke="#00ff00"
            strokeOpacity={1}
            strokeWidth={2}
        />
    )
}

function unSelectElement(element: DrawZoneElement): DrawZoneElement {
    if (element.selected)
        return {
            ...element,
            selected: true,
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
