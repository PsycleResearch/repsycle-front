import React, {
    Dispatch,
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useReducer,
    useRef,
    useState,
} from 'react'
import {
    ArrayXY,
    Circle,
    FillData,
    PointArrayAlias,
    Polygon,
    Polyline,
    Rect,
    SVG,
    StrokeData,
    Svg,
    Use,
} from '@svgdotjs/svg.js'
import '@svgdotjs/svg.draggable.js'
import interact from 'interactjs'
import { DraggableOptions } from '@interactjs/types/index'
import { uuid4 } from '../helpers'
import { useMousePosition } from '../hooks'
import { isTouchDevice } from '../utils'
import { LinkedHTMLElement } from '@svgdotjs/svg.js'

export type DrawZoneMode = 'draw' | 'path' | 'move' | 'none'
export type SizeMode = 'auto' | 'fit'

export interface Size {
    readonly width: number
    readonly height: number
}
export interface Point {
    readonly x: number
    readonly y: number
}
export interface ChangedElement {
    readonly id: string
    readonly selected: boolean
    readonly points: Point[]
    readonly label: string
    readonly rect: {
        readonly height: number
        readonly width: number
        readonly x: number
        readonly y: number
    }
    readonly color?: string
}

export type DrawZoneState = {
    readonly scale: number
    readonly isMarkerShown: boolean
    readonly isDisabled: boolean
    readonly originalSize: Size | undefined
}

export const MAX_SCALE = 4
export const SCALE_STEP = 0.25

type DrawZoneStateInternal = DrawZoneState & {
    readonly logicalScale: number
    readonly positionTop: number
    readonly positionLeft: number
    readonly redraw: boolean
}

enum DrawZoneStateActionType {
    RESET,
    SET_SCALE,
    ZOOM_IN,
    ZOOM_OUT,
    CHANGE_MODE,
    CHANGE_SIZE_MODE,
    SHOW_MARKER,
    HIDE_MARKER,
    DISABLE,
    ENABLE,
    SET_ORIGINAL_SIZE,
    SET_POSITION,
    FORCE_REDRAW,
}

type DrawZoneStateAction =
    | { readonly type: DrawZoneStateActionType.RESET }
    | {
          readonly type: DrawZoneStateActionType.SET_SCALE
          readonly payload: number
      }
    | {
          readonly type: DrawZoneStateActionType.ZOOM_IN
      }
    | {
          readonly type: DrawZoneStateActionType.ZOOM_OUT
      }
    | {
          readonly type: DrawZoneStateActionType.SHOW_MARKER
      }
    | {
          readonly type: DrawZoneStateActionType.HIDE_MARKER
      }
    | {
          readonly type: DrawZoneStateActionType.DISABLE
      }
    | {
          readonly type: DrawZoneStateActionType.ENABLE
      }
    | {
          readonly type: DrawZoneStateActionType.SET_ORIGINAL_SIZE
          readonly payload: Size | undefined
      }
    | {
          readonly type: DrawZoneStateActionType.SET_POSITION
          readonly payload: {
              readonly top: number
              readonly left: number
          }
      }
    | {
          readonly type: DrawZoneStateActionType.FORCE_REDRAW
      }

const drawZoneInitialState: DrawZoneStateInternal = {
    scale: 1,
    isMarkerShown: false,
    isDisabled: false,
    originalSize: undefined,
    // Internal props
    logicalScale: 1,
    positionTop: 0,
    positionLeft: 0,
    redraw: false,
}

const drawZoneReducer = (
    state: DrawZoneStateInternal,
    action: DrawZoneStateAction,
): DrawZoneStateInternal => {
    switch (action.type) {
        case DrawZoneStateActionType.RESET:
            return {
                ...state,
                logicalScale: 1,
                positionTop: 0,
                positionLeft: 0,
            }
        case DrawZoneStateActionType.SET_SCALE:
            return {
                ...state,
                scale: action.payload,
            }
        case DrawZoneStateActionType.ZOOM_IN:
            return {
                ...state,
                logicalScale: Math.min(
                    state.logicalScale + SCALE_STEP,
                    MAX_SCALE,
                ),
            }
        case DrawZoneStateActionType.ZOOM_OUT:
            return {
                ...state,
                logicalScale: Math.max(
                    SCALE_STEP,
                    state.logicalScale - SCALE_STEP,
                ),
            }
        case DrawZoneStateActionType.SHOW_MARKER:
            return {
                ...state,
                isMarkerShown: true,
            }
        case DrawZoneStateActionType.HIDE_MARKER:
            return {
                ...state,
                isMarkerShown: false,
            }
        case DrawZoneStateActionType.DISABLE:
            return {
                ...state,
                isDisabled: true,
            }
        case DrawZoneStateActionType.ENABLE:
            return {
                ...state,
                isDisabled: false,
            }
        case DrawZoneStateActionType.SET_ORIGINAL_SIZE:
            return {
                ...state,
                originalSize: action.payload,
            }
        case DrawZoneStateActionType.SET_POSITION:
            return {
                ...state,
                positionTop: action.payload.top,
                positionLeft: action.payload.left,
            }
        case DrawZoneStateActionType.FORCE_REDRAW:
            return {
                ...state,
                redraw: !state.redraw,
            }
        default:
            return state
    }
}

const DrawZoneContext = createContext<{
    readonly state: DrawZoneStateInternal
    readonly dispatch: Dispatch<DrawZoneStateAction>
}>({
    state: drawZoneInitialState,
    dispatch: () => undefined,
})

export function useDrawZone() {
    const { state, dispatch } = useContext(DrawZoneContext)

    const zoomIn = useCallback(() => {
        dispatch({ type: DrawZoneStateActionType.ZOOM_IN })
    }, [dispatch])

    const zoomOut = useCallback(() => {
        dispatch({ type: DrawZoneStateActionType.ZOOM_OUT })
    }, [dispatch])

    const reset = useCallback(() => {
        dispatch({ type: DrawZoneStateActionType.RESET })
    }, [dispatch])

    const toggleMarker = useCallback(() => {
        if (state.isMarkerShown) {
            dispatch({ type: DrawZoneStateActionType.HIDE_MARKER })
        } else {
            dispatch({ type: DrawZoneStateActionType.SHOW_MARKER })
        }
    }, [dispatch, state.isMarkerShown])

    const disable = useCallback(() => {
        dispatch({ type: DrawZoneStateActionType.DISABLE })
    }, [dispatch])

    const enable = useCallback(() => {
        dispatch({ type: DrawZoneStateActionType.ENABLE })
    }, [dispatch])

    const redraw = useCallback(() => {
        dispatch({ type: DrawZoneStateActionType.FORCE_REDRAW })
    }, [dispatch])

    return {
        ...(state as DrawZoneState),
        zoomIn,
        zoomOut,
        reset,
        toggleMarker,
        disable,
        enable,
        redraw,
    }
}

export type DrawZoneContainerProps = Partial<DrawZoneState> & {
    readonly children: ReactNode
}
export function DrawZoneContainer({
    children,
    ...props
}: DrawZoneContainerProps) {
    const [state, dispatch] = useReducer(drawZoneReducer, {
        ...drawZoneInitialState,
        ...props,
    })

    return (
        <DrawZoneContext.Provider value={{ state, dispatch }}>
            {children}
        </DrawZoneContext.Provider>
    )
}

const xns = 'http://www.w3.org/1999/xlink'
const blue = '#2BB1FD'
const defaultStroke = { color: '#fff', width: 2, opacity: 1 }
const defaultFill = { color: '#000', opacity: 0 }

function getRectCoords(rect: Rect) {
    const bbox = rect.bbox()
    return [
        { x: bbox.x, y: bbox.y },
        { x: bbox.x, y: bbox.y2 },
        { x: bbox.x2, y: bbox.y2 },
        { x: bbox.x2, y: bbox.y },
    ]
}

function useDraw(
    ref: React.RefObject<HTMLElement>,
    src: string,
    props: {
        onChange: (elements: Array<ChangedElement>) => void
        remove: (id: string) => void
        mode: DrawZoneMode
        drawOnMouseDown?: boolean
    },
) {
    const {
        state: { isMarkerShown, isDisabled, scale, positionTop, positionLeft },
        dispatch,
    } = useContext(DrawZoneContext)
    const [svg, setSvg] = useState<Svg>()
    const [originalSize, setOriginalSize] = useState<Size>()
    let startPosition: Point | null
    let overlayRect: Rect | undefined
    let overlayRect2: Rect | undefined
    let poly: Polygon | undefined
    let tmpPoly: Polyline | undefined
    let tmpPoints: Array<Circle> | undefined
    let dragging: boolean

    function getAbsoluteCoordinates(points: Point[]) {
        if (!svg) return points
        const svgRect = svg.node.getBoundingClientRect()

        return points.map(({ x, y }) => ({
            x: x / svgRect.width,
            y: y / svgRect.height,
        }))
    }

    const onChange = useCallback(() => {
        if (svg && props.onChange) {
            const svgRect = svg.node.getBoundingClientRect()

            props.onChange(
                svg
                    .children()
                    .filter((e) => !e.attr('data-draw-ignore'))
                    .map((elt) => {
                        const elementRect = elt.node.getBoundingClientRect()

                        const rect: ChangedElement['rect'] = {
                            height: (elementRect.height / svgRect.height) * 100,
                            width: (elementRect.width / svgRect.width) * 100,
                            x:
                                ((elementRect.x - svgRect.x) / svgRect.width) *
                                100,
                            y:
                                ((elementRect.y - svgRect.y) / svgRect.height) *
                                100,
                        }

                        let points: Point[]

                        if (elt instanceof Polygon) {
                            const polygon = elt as Polygon

                            points = getAbsoluteCoordinates(
                                polygon.plot().map((p) => ({
                                    x: p[0],
                                    y: p[1],
                                })),
                            )
                        } else {
                            const box = elt.bbox()
                            points = getAbsoluteCoordinates([
                                {
                                    x: box.x,
                                    y: box.y,
                                },
                                {
                                    x: box.x2,
                                    y: box.y2,
                                },
                            ])
                        }

                        const result = {
                            points,
                            rect,
                            label: elt.data('label'),
                            selected: elt.data('selected') as boolean,
                            id: elt.data('id'),
                            color: elt.data('color'),
                        }

                        return result
                    }),
            )
        }
    }, [svg, props.onChange])

    function onDelKeyPress(this: SVGElement, event: KeyboardEvent): boolean {
        if (event.defaultPrevented) return false
        if (event.key === 'Delete' && this.closest('svg')) {
            event.preventDefault()
            props.remove(this.dataset['id'] as string)

            return true
        }

        return false
    }

    function onEscKeyPress(this: SVGElement, event: KeyboardEvent): boolean {
        if (event.defaultPrevented) return false
        if (event.key === 'Escape' && this.closest('svg')) {
            event.preventDefault()
            ;(this as unknown as LinkedHTMLElement).instance.fire('deselect')

            return true
        }

        return false
    }

    function endPolyDrawing(event: Event) {
        if (!svg || !poly) return

        const svgRect = svg.node.getBoundingClientRect()
        const plot = poly.plot()

        if (plot.length < 3) return

        event.preventDefault()

        poly.remove()
        poly = undefined

        if (tmpPoints && tmpPoints.length > 0) {
            tmpPoints.forEach((p) => p.remove())
            tmpPoints = undefined
        }

        if (tmpPoly) {
            tmpPoly.remove()
            tmpPoly = undefined
        }

        startPosition = null

        const newPoly = drawPoly({
            points: plot.map(([x, y]) => ({
                x: x / svgRect.width,
                y: y / svgRect.height,
            })),
        })

        window.removeEventListener('keyup', onAbortPathDrawing, {
            capture: true,
        })
        window.removeEventListener('keyup', onEnterKeyPress, { capture: true })

        if (newPoly) {
            newPoly.fire('select')
        }

        onChange()
    }

    function onEnterKeyPress(this: Window, event: KeyboardEvent) {
        if (event.defaultPrevented) return
        if (event.key === 'Enter') {
            event.preventDefault()

            endPolyDrawing(event)
        }
    }

    function onAbortPathDrawing(this: Window, event: KeyboardEvent) {
        if (event.defaultPrevented) return
        if (event.key === 'Escape') {
            event.preventDefault()

            if (tmpPoints && tmpPoints.length > 0) {
                tmpPoints.forEach((p) => p.remove())
                tmpPoints = undefined
            }

            if (tmpPoly) {
                tmpPoly.remove()
                tmpPoly = undefined
            }

            if (poly) {
                poly.remove()
                poly = undefined
            }

            startPosition = null

            window.removeEventListener('keyup', onAbortPathDrawing, {
                capture: true,
            })
            window.removeEventListener('keyup', onEnterKeyPress, {
                capture: true,
            })
        }
    }

    const preventDrag = (event: DragEvent) => {
        event.preventDefault()
    }

    function drawRect({
        points,
        disabled = isDisabled,
        stroke = { ...defaultStroke },
        fill = { ...defaultFill },
        label,
        id = null,
    }: {
        points: Point[]
        disabled?: boolean
        stroke?: StrokeData
        fill?: FillData
        label?: string
        id?: string | null
    }) {
        if (!svg || !points || points.length !== 2) {
            return
        }

        const rect = svg.rect(0, 0)

        rect.move(`${points[0].x * 100}%`, `${points[0].y * 100}%`)

        rect.width(`${Math.abs(points[1].x - points[0].x) * 100}%`)

        rect.height(`${Math.abs(points[1].y - points[0].y) * 100}%`)
        rect.fill(fill)
        rect.stroke(stroke)
        rect.css('touch-action', 'none') // silence interactjs warning.

        function rectDelKeyPress(ev: KeyboardEvent) {
            const result = onDelKeyPress.call(rect.node, ev)

            if (result) {
                window.removeEventListener('keyup', rectDelKeyPress, {
                    capture: true,
                })
            }
        }
        function rectEscKeyPress(ev: KeyboardEvent) {
            const result = onEscKeyPress.call(rect.node, ev)

            if (result) {
                window.removeEventListener('keyup', rectEscKeyPress, {
                    capture: true,
                })
            }
        }

        let circle: Circle | undefined
        const handles: Use[] = []

        // Custom events.
        rect.on('select', () => {
            // Deselect all

            svg.each(function (this: Svg) {
                this.fire('deselect', { inst: rect })
            })
            rect.stroke({ color: blue })
            rect.data('selected', true)

            const coords = getRectCoords(rect)

            if (!disabled) {
                handles.forEach((h) => h.remove())
                handles.length = 0
                circle?.remove()
                circle = undefined
                window.addEventListener('keyup', rectDelKeyPress, {
                    capture: true,
                })
                window.addEventListener('keyup', rectEscKeyPress, {
                    capture: true,
                })

                circle = svg
                    .defs()
                    .attr('data-draw-ignore', true)
                    .circle(7)
                    .center(0, 0)
                    .fill({ opacity: 1, color: blue })
                    .stroke({ width: 1, color: '#fff' })
                    .id('point-handle')

                for (let i = 0; i < coords.length; i++) {
                    const point = coords[i]

                    const handle = svg
                        .use(circle as Circle)
                        .attr('href', '#point-handle', xns)
                        .addClass('point-handle')
                        .data('draw-ignore', true)
                        .x(point.x)
                        .y(point.y)
                        .data('index', i)
                        .back()

                    handles.push(handle)
                }

                document.addEventListener('dragstart', preventDrag)
            }

            onChange()
        })
        rect.on('deselect', (e) => {
            if ((e as CustomEvent).detail?.inst === rect) return
            rect.stroke(stroke)
            rect.data('selected', false)

            interact('.point-handle').unset()
            handles.forEach((h) => h.remove())
            handles.length = 0
            circle?.remove()
            circle = undefined
            document.removeEventListener('dragstart', preventDrag)

            window.removeEventListener('keyup', rectDelKeyPress, {
                capture: true,
            })
            window.removeEventListener('keyup', rectEscKeyPress, {
                capture: true,
            })

            onChange()
        })

        if (!disabled) {
            rect.css('cursor', 'move')

            interact(rect.node)
                .resizable({
                    edges: { left: true, right: true, bottom: true, top: true },
                    listeners: {
                        move(event) {
                            const svgRect = svg.node.getBoundingClientRect()

                            event.target.instance.width(
                                `${(event.rect.width / svgRect.width) * 100}%`,
                            )
                            event.target.instance.height(
                                `${
                                    (event.rect.height / svgRect.height) * 100
                                }%`,
                            )

                            // translate when resizing from top or left edges
                            const x =
                                (parseFloat(event.target.instance.x()) / 100) *
                                svgRect.width
                            const y =
                                (parseFloat(event.target.instance.y()) / 100) *
                                svgRect.height
                            event.target.instance.x(
                                `${
                                    ((x + event.deltaRect.left) /
                                        svgRect.width) *
                                    100
                                }%`,
                            )
                            event.target.instance.y(
                                `${
                                    ((y + event.deltaRect.top) /
                                        svgRect.height) *
                                    100
                                }%`,
                            )

                            const coords = getRectCoords(event.target.instance)
                            handles.forEach((h) => {
                                h.x(coords[h.data('index')].x)
                                h.y(coords[h.data('index')].y)
                            })

                            onChange()
                        },
                    },
                    modifiers: [
                        interact.modifiers.restrictEdges({
                            outer: 'parent',
                        }),
                        interact.modifiers.restrictSize({
                            min: { width: 20, height: 20 },
                        }),
                    ],
                })
                .draggable({
                    listeners: {
                        start(event) {
                            event.target.instance.fire('select')
                            handles.forEach((h) => h.hide())
                            rect.css('cursor', 'grabbing')
                        },
                        move(event) {
                            rect.css('cursor', 'grabbing')
                            const svgRect = svg.node.getBoundingClientRect()

                            const x =
                                (parseFloat(event.target.instance.x()) / 100) *
                                svgRect.width
                            const y =
                                (parseFloat(event.target.instance.y()) / 100) *
                                svgRect.height

                            event.target.instance.x(
                                `${((x + event.dx) / svgRect.width) * 100}%`,
                            )
                            event.target.instance.y(
                                `${((y + event.dy) / svgRect.height) * 100}%`,
                            )

                            onChange()
                        },
                        end(event) {
                            const coords = getRectCoords(event.target.instance)
                            handles.forEach((h) => {
                                h.x(coords[h.data('index')].x)
                                h.y(coords[h.data('index')].y)
                            })

                            handles.forEach((h) => h.show())

                            rect.css('cursor', 'move')

                            onChange()
                        },
                    },
                    modifiers: [
                        interact.modifiers.restrictRect({
                            restriction: 'parent',
                        }),
                    ],
                    cursorChecker: (
                        action,
                        interactable,
                        element,
                        interacting,
                    ) => {
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
        }

        rect.data('disabled', disabled)
        rect.data('id', id || uuid4())
        rect.data('label', label)

        if (stroke.color !== defaultStroke.color)
            rect.data('color', stroke.color)

        return rect
    }

    function drawPoly({
        points,
        disabled = isDisabled,
        stroke = { ...defaultStroke },
        fill = { ...defaultFill },
        label,
        id = null,
    }: {
        points: Point[]
        disabled?: boolean
        stroke?: { color: string; width: number; opacity: number }
        fill?: { color: string; opacity: number }
        label?: string
        id?: string | null
    }) {
        if (!svg || !points || points.length < 2) {
            return
        }
        const svgRect = svg.node.getBoundingClientRect()

        const svgWidth = svgRect.width || originalSize?.width || 0
        const svgHeight = svgRect.height || originalSize?.height || 0

        const poly = svg.polygon(
            points.map(
                (point) => [point.x * svgWidth, point.y * svgHeight] as ArrayXY,
            ),
        )

        poly.fill(fill)
        poly.stroke(stroke)
        poly.css('touch-action', 'none') // silence interactjs warning.

        const circles: Circle[] = []
        const handles: Use[] = []
        let rootMatrix: DOMMatrix

        function polyDelKeyPress(ev: KeyboardEvent) {
            const result = onDelKeyPress.call(poly.node, ev)

            if (result) {
                window.removeEventListener('keyup', polyDelKeyPress, {
                    capture: true,
                })
            }
        }
        function polyEscKeyPress(ev: KeyboardEvent) {
            const result = onEscKeyPress.call(poly.node, ev)

            if (result) {
                window.removeEventListener('keyup', polyEscKeyPress, {
                    capture: true,
                })
            }
        }

        function makeHandlesGrabbable(svg: Svg) {
            interact('.point-handle')
                .draggable({
                    onstart: function (event) {
                        svg.css('cursor', 'grabbing')
                        event.target.instance.css('cursor', 'grabbing')
                    },
                    onmove: function (event) {
                        const i = event.target.getAttribute('data-index') | 0
                        const point = poly.node.points.getItem(i)

                        point.x += event.dx / rootMatrix.a
                        point.y += event.dy / rootMatrix.d

                        event.target.x.baseVal.value = point.x
                        event.target.y.baseVal.value = point.y
                    },
                    onend: function (event) {
                        event.target.instance.css('cursor', 'grab')
                        svg.css('cursor', 'crosshair')
                        const index = Number(
                            event.target.getAttribute('data-index') || 0,
                        )

                        const currentPlot = [...poly.plot()]

                        const newPlot: ArrayXY[] = [
                            ...currentPlot.slice(0, index),
                            [
                                Number(event.target.getAttribute('x')),
                                Number(event.target.getAttribute('y')),
                            ] as ArrayXY,
                            ...currentPlot.slice(index + 1),
                        ]

                        poly.plot(newPlot)

                        svg.node.setAttribute('class', '')
                        onChange()
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
                } as DraggableOptions)
                .styleCursor(false)
        }

        // Custom events.
        poly.on('select', () => {
            // Deselect all
            svg.each(function (this: Svg) {
                this.fire('deselect', { inst: poly })
            })
            poly.stroke({ color: blue })
            poly.data('selected', true)
            window.addEventListener('keyup', polyDelKeyPress, {
                capture: true,
            })
            window.addEventListener('keyup', polyEscKeyPress, {
                capture: true,
            })

            if (!disabled) {
                handles.forEach((h) => h.remove())
                handles.length = 0
                circles.forEach((c) => c.remove())
                circles.length = 0
                rootMatrix = svg.node.getScreenCTM() as DOMMatrix

                for (let i = 0; i < poly.node.points.numberOfItems; i++) {
                    const point = poly.node.points.getItem(i)

                    const handleId = `point-handle-${i}`

                    const circle = svg
                        .defs()
                        .attr('data-draw-ignore', true)
                        .circle(7)
                        .center(0, 0)
                        .fill({ opacity: 1, color: blue })
                        .stroke({ width: 1, color: '#fff' })
                        .id(handleId)

                    const mouseenter = () => {
                        circle.scale(1.4)

                        circle.on('mouseleave', mouseleave)
                        circle.off('mouseenter', mouseenter)
                    }
                    const mouseleave = () => {
                        circle.scale(5 / 7)

                        circle.on('mouseenter', mouseenter)
                        circle.off('mouseleave', mouseleave)
                    }

                    circle.on('mouseenter', mouseenter)

                    const handle = svg
                        .use(circle as Circle)
                        .attr('href', `#${handleId}`, xns)
                        .addClass('point-handle')
                        .data('draw-ignore', true)
                        .x(point.x)
                        .y(point.y)
                        .data('index', i)

                    handle
                        .on('mousedown', function mousedown(event) {
                            event.preventDefault()
                            event.stopPropagation()
                        })
                        .css('cursor', 'grab')

                    circles.push(circle)
                    handles.push(handle)
                }

                makeHandlesGrabbable(svg)

                document.addEventListener('dragstart', preventDrag)
            }

            onChange()
        })
        poly.on('deselect', (e) => {
            if ((e as CustomEvent).detail?.inst === poly) return
            poly.stroke(stroke)
            poly.data('selected', false)

            interact('.point-handle').unset()
            handles.forEach((h) => h.remove())
            handles.length = 0
            circles.forEach((circle) => circle.remove())
            circles.length = 0
            document.removeEventListener('dragstart', preventDrag)

            window.removeEventListener('keyup', polyDelKeyPress, {
                capture: true,
            })
            window.removeEventListener('keyup', polyEscKeyPress, {
                capture: true,
            })

            onChange()
        })

        if (!disabled) {
            poly.css('cursor', 'move')

            interact(poly.node).draggable({
                listeners: {
                    start() {
                        interact('.point-handle').unset()
                        handles.forEach((handle) => {
                            handle.remove()
                        })
                        handles.length = 0
                        circles.forEach((circle) => {
                            circle.remove()
                        })
                        circles.length = 0
                    },
                    move(event) {
                        const x = parseFloat(event.target.instance.x())
                        const y = parseFloat(event.target.instance.y())

                        event.target.instance.x(x + event.dx)
                        event.target.instance.y(y + event.dy)

                        onChange()
                    },
                    end() {
                        for (
                            let i = 0;
                            i < poly.node.points.numberOfItems;
                            i++
                        ) {
                            const point = poly.node.points.getItem(i)

                            const handleId = `point-handle-${i}`

                            const newCircle = svg
                                .defs()
                                .attr('data-draw-ignore', true)
                                .circle(7)
                                .center(0, 0)
                                .fill({ opacity: 1, color: blue })
                                .stroke({ width: 1, color: '#fff' })
                                .id(handleId)

                            const mouseenter = () => {
                                newCircle.scale(1.4)

                                newCircle.on('mouseleave', mouseleave)
                                newCircle.off('mouseenter', mouseenter)
                            }
                            const mouseleave = () => {
                                newCircle.scale(5 / 7)

                                newCircle.on('mouseenter', mouseenter)
                                newCircle.off('mouseleave', mouseleave)
                            }

                            newCircle.on('mouseenter', mouseenter)

                            const handle = svg
                                .use(newCircle as Circle)
                                .attr('href', `#${handleId}`, xns)
                                .addClass('point-handle')
                                .data('draw-ignore', true)
                                .x(point.x)
                                .y(point.y)
                                .data('index', i)

                            handle
                                .on('mousedown', function mousedown(event) {
                                    event.preventDefault()
                                    event.stopPropagation()
                                })
                                .css('cursor', 'grab')

                            circles.push(newCircle)
                            handles.push(handle)
                        }

                        makeHandlesGrabbable(svg)
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
        }

        poly.data('disabled', disabled)
        poly.data('id', id || uuid4())
        poly.data('label', label)

        if (defaultStroke.color !== stroke.color)
            poly.data('color', stroke.color)

        return poly
    }

    function drawPoint(svg: Svg, x: number, y: number): Circle {
        const point = svg
            .circle(6)
            .center(0, 0)
            .fill({ opacity: 1, color: '#f06' })
            .stroke({ width: 1, color: '#fff' })
            .attr('data-draw-ignore', true)
            .move(x - 3, y - 3)

        const mouseenter = () => {
            point.scale(1.4)

            point.on('mouseleave', mouseleave)
            point.off('mouseenter', mouseenter)
        }
        const mouseleave = () => {
            point.scale(5 / 7)

            point.on('mouseenter', mouseenter)
            point.off('mouseleave', mouseleave)
        }

        point.on('mouseenter', mouseenter)
        point.on('click', function (event) {
            event.preventDefault()
            event.stopPropagation()

            endPolyDrawing(event)
        })

        return point
    }

    const draw = ({
        points: inputPoints,
        id,
        color,
        label,
    }: {
        readonly points: Array<Point>
        readonly id: string
        readonly color?: string
        readonly label?: string
    }) => {
        const fill = color ? { ...defaultFill, color } : defaultFill
        const stroke = color ? { ...defaultStroke, color } : defaultStroke

        const points = inputPoints.map(
            (point) =>
                ({
                    x: point.x,
                    y: point.y,
                } as Point),
        )

        if (points.length === 2) drawRect({ points, id, fill, stroke, label })
        else drawPoly({ points, id, fill, stroke, label })
    }

    function onMouseDown(e: globalThis.MouseEvent) {
        if (e.defaultPrevented) return
        if (!svg) return

        if (!svg.node.contains(e.target as Node)) return

        if (
            svg.node.contains(e.target as Node) &&
            svg.node !== e.target &&
            !startPosition
        ) {
            const element = e.target as unknown as LinkedHTMLElement

            element.instance.fire('select')
            return
        } else if (e.target === svg.node) {
            svg.each(function (this: Svg) {
                this.fire('deselect')
            })
            onChange()
        }

        if (props.mode === 'draw' && !isDisabled) {
            const svgRect = svg.node.getBoundingClientRect()

            startPosition = {
                x: e.clientX - svgRect.left,
                y: e.clientY - svgRect.top,
            }

            if (!overlayRect || !overlayRect2) {
                overlayRect = svg.rect(0, 0).fill({ opacity: 0 }).stroke({
                    color: '#000',
                    width: 2,
                    opacity: 0.7,
                    dasharray: '5,5',
                })
                overlayRect2 = svg.rect(0, 0).fill({ opacity: 0 }).stroke({
                    color: '#fff',
                    width: 2,
                    opacity: 0.7,
                    dasharray: '5,5',
                    dashoffset: 5,
                })
            }

            overlayRect.move(
                startPosition.x / svgRect.width,
                startPosition.y / svgRect.height,
            )

            overlayRect2.move(
                startPosition.x / svgRect.width,
                startPosition.y / svgRect.height,
            )

            e.preventDefault()
        } else if (props.mode === 'path' && !isDisabled) {
            const svgRect = svg.node.getBoundingClientRect()

            if (!tmpPoly) {
                startPosition = {
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                }

                tmpPoints = [drawPoint(svg, startPosition.x, startPosition.y)]

                window.addEventListener('keyup', onAbortPathDrawing, {
                    capture: true,
                })
                window.addEventListener('keyup', onEnterKeyPress, {
                    capture: true,
                })
            } else if (startPosition && tmpPoly) {
                const currentPosition = {
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                }

                const prev = poly
                    ? [...poly.plot()]
                    : [[startPosition.x, startPosition.y] as ArrayXY]

                if (poly) {
                    poly.remove()
                    poly = undefined
                }

                const start = prev[0]
                if (
                    prev.length > 2 &&
                    Math.abs(currentPosition.x - start[0]) <= 10 &&
                    Math.abs(currentPosition.y - start[1]) <= 10
                ) {
                    if (tmpPoints && tmpPoints.length > 0) {
                        tmpPoints.forEach((p) => p.remove())
                        tmpPoints = undefined
                    }

                    if (tmpPoly) {
                        tmpPoly.remove()
                        tmpPoly = undefined
                    }

                    startPosition = null

                    const poly = drawPoly({
                        points: prev.map(([x, y]) => ({
                            x: x / svgRect.width,
                            y: y / svgRect.height,
                        })),
                    })

                    window.removeEventListener('keyup', onAbortPathDrawing, {
                        capture: true,
                    })
                    window.removeEventListener('keyup', onEnterKeyPress, {
                        capture: true,
                    })

                    poly?.fire('select')

                    onChange()
                } else {
                    const plotline: PointArrayAlias = [
                        ...prev,
                        [currentPosition.x, currentPosition.y],
                    ]

                    poly = svg
                        .polygon(plotline)
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

                    if (Array.isArray(tmpPoints)) {
                        tmpPoints.push(
                            drawPoint(
                                svg,
                                currentPosition.x,
                                currentPosition.y,
                            ),
                        )

                        tmpPoints.forEach((p) => p.front())
                    }

                    startPosition = currentPosition
                }
            }
        } else if (props.mode === 'move') {
            startPosition = {
                x: e.clientX,
                y: e.clientY,
            }

            dragging = true

            svg.css({
                cursor: 'grabbing',
            })

            e.preventDefault()
        }
    }

    function onMouseMove(this: Window, e: globalThis.MouseEvent) {
        if (e.defaultPrevented) return
        if (!svg || !startPosition) return

        if (props.mode === 'draw' && !isDisabled) {
            if (overlayRect && overlayRect2) {
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

                const minX =
                    Math.min(startPosition.x, currentPosition.x) / svgRect.width
                const minY =
                    Math.min(startPosition.y, currentPosition.y) /
                    svgRect.height
                const maxX =
                    Math.max(startPosition.x, currentPosition.x) / svgRect.width
                const maxY =
                    Math.max(startPosition.y, currentPosition.y) /
                    svgRect.height

                const width = Math.abs(maxX - minX)
                const height = Math.abs(maxY - minY)

                overlayRect.move(`${minX * 100}%`, `${minY * 100}%`)
                overlayRect.width(`${width * 100}%`)
                overlayRect.height(`${height * 100}%`)
                overlayRect2.move(`${minX * 100}%`, `${minY * 100}%`)
                overlayRect2.width(`${width * 100}%`)
                overlayRect2.height(`${height * 100}%`)
            }
        } else if (props.mode === 'move' && dragging) {
            if (!svg.node.contains(e.target as Node)) {
                dragging = false
                return
            }
            const parent = svg.parent()

            if (!parent) return

            const currentPosition = {
                x: e.clientX,
                y: e.clientY,
            }
            const translationX = currentPosition.x - startPosition.x
            const translationY = currentPosition.y - startPosition.y

            parent.css(
                'transform',
                `translate3d(${translationX}px, ${translationY}px, 0px)`,
            )
        } else if (props.mode === 'path') {
            const svgRect = svg.node.getBoundingClientRect()

            const currentPosition: Point = {
                x: e.clientX - svgRect.left,
                y: e.clientY - svgRect.top,
            }

            if (tmpPoly) {
                tmpPoly.remove()
                tmpPoly = undefined
            }

            const prev = poly
                ? [...poly.plot()]
                : [[startPosition.x, startPosition.y] as ArrayXY]

            const plotline: PointArrayAlias = [
                ...prev,
                [currentPosition.x, currentPosition.y],
            ]

            tmpPoly = svg
                .polyline(plotline)
                .fill('none')
                .stroke({
                    color: '#f06',
                    width: 1,
                    linecap: 'round',
                    linejoin: 'round',
                    dasharray: '5,5',
                })
                .attr('data-draw-ignore', true)

            if (Array.isArray(tmpPoints)) {
                tmpPoints.forEach((point) => point.front())
            }
        }
    }

    function onMouseUp(this: Window, e: globalThis.MouseEvent) {
        if (e.defaultPrevented) return
        if (!svg) return

        if (props.mode === 'draw' && !isDisabled) {
            if (!startPosition) {
                return
            }

            if (overlayRect || overlayRect2) {
                overlayRect?.remove()
                overlayRect = undefined
                overlayRect2?.remove()
                overlayRect2 = undefined
            }

            // Prevent drawing new rect on rect dragend...
            if ((e.target as Node | null)?.parentNode === svg.node) {
                startPosition = null
                return
            }

            const svgRect = svg.node.getBoundingClientRect()
            const currentPosition = {
                x:
                    Math.max(Math.min(e.clientX, svgRect.right), svgRect.left) -
                    svgRect.left,
                y:
                    Math.max(Math.min(e.clientY, svgRect.bottom), svgRect.top) -
                    svgRect.top,
            }

            // Prevent adding very small rects (mis-clicks).
            if (Math.abs(currentPosition.x - startPosition.x) <= 2) {
                if (props.drawOnMouseDown) {
                    currentPosition.x = startPosition.x + 50
                    currentPosition.y = startPosition.y + 50
                } else {
                    startPosition = null
                    return
                }
            }

            const newRect = drawRect({
                points: [
                    {
                        x:
                            Math.min(startPosition.x, currentPosition.x) /
                            svgRect.width,
                        y:
                            Math.min(startPosition.y, currentPosition.y) /
                            svgRect.height,
                    },
                    {
                        x:
                            Math.max(startPosition.x, currentPosition.x) /
                            svgRect.width,
                        y:
                            Math.max(startPosition.y, currentPosition.y) /
                            svgRect.height,
                    },
                ],
            })

            setTimeout(() => {
                newRect?.fire('select')
                onChange()
            }, 50)
        } else if (props.mode === 'move' && dragging) {
            const parent = svg.parent()

            if (parent) {
                const grandParent = parent.parent()

                if (grandParent) {
                    const parentRect = grandParent.node.getBoundingClientRect()
                    const svgRect = parent.node.getBoundingClientRect()

                    dispatch({
                        type: DrawZoneStateActionType.SET_POSITION,
                        payload: {
                            top: svgRect.top - parentRect.top,
                            left: svgRect.left - parentRect.left,
                        },
                    })

                    svg.css({ cursor: 'grab' })

                    dragging = false
                }
            }
        }

        if (props.mode !== 'path') startPosition = null
    }

    useEffect(() => {
        if (!ref.current) {
            return
        }

        const image = new Image()
        image.onload = () => {
            setOriginalSize({
                width: image.naturalWidth,
                height: image.naturalHeight,
            })
        }
        image.src = src
        ref.current.style.background = `url('${src}') center center / 100% 100% no-repeat`
        ref.current.style.top = `${positionTop}px`
        ref.current.style.left = `${positionLeft}px`

        if (svg) {
            svg.node.remove()
        }

        const newSvg = SVG().addTo(ref.current).size('100%', '100%').attr({
            'xmlns:xlink': xns,
        })

        setSvg(newSvg)
    }, [ref, src])

    useEffect(() => {
        if (ref.current && originalSize && scale) {
            ref.current.style.width = `${originalSize.width * scale}px`

            ref.current.style.height = `${originalSize.height * scale}px`

            if (svg) {
                dispatch({
                    type: DrawZoneStateActionType.FORCE_REDRAW,
                })
            }
        }
    }, [ref, originalSize, scale])

    useLayoutEffect(() => {
        if (!svg) {
            return
        }

        svg.css({
            cursor:
                props.mode === 'move' && !isDisabled
                    ? 'grab'
                    : props.mode === 'none' && !isMarkerShown
                    ? 'normal'
                    : 'crosshair',
            position: 'absolute',
            top: '0',
            left: '0',
        })

        const parent = svg.parent()

        if (parent) {
            parent.css({
                position: 'relative',
                userSelect: 'none',
                transform: 'none',
            })
        }

        svg.on('mousedown', onMouseDown as unknown as EventListener)
        window.addEventListener('mouseup', onMouseUp)
        window.addEventListener('mousemove', onMouseMove)

        return () => {
            svg.off('mousedown', onMouseDown as unknown as EventListener)
            window.removeEventListener('mouseup', onMouseUp)
            window.removeEventListener('mousemove', onMouseMove)
        }
    }, [svg, props.mode])

    return {
        svg,
        draw,
        originalSize,
    }
}

export interface DrawZoneProps {
    readonly children?: React.ReactNode
    readonly mode?: DrawZoneMode
    readonly sizeMode?: SizeMode
    readonly src: string
    readonly elements: Partial<ChangedElement>[]
    readonly onChange: (elements: ChangedElement[]) => void
    readonly remove: (id: string) => void
}

export default function DrawZone({
    children,
    mode = 'draw',
    sizeMode = 'auto',
    src,
    elements,
    onChange,
    remove,
}: DrawZoneProps) {
    const {
        state: {
            scale,
            isMarkerShown,
            positionTop,
            positionLeft,
            redraw,
            logicalScale,
        },
        dispatch,
    } = useContext(DrawZoneContext)
    const svgRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const { svg, draw, originalSize } = useDraw(svgRef, src, {
        onChange,
        remove,
        mode,
        drawOnMouseDown: false,
    })
    const [canMarkerBeVisible, setCanMarkerBeVisible] = useState(false)
    const [forceRedraw, setForceRedraw] = useState(false)

    const setScale = useCallback(
        (scale: number) => {
            dispatch({
                type: DrawZoneStateActionType.SET_SCALE,
                payload: scale,
            })
        },
        [dispatch],
    )

    useEffect(() => {
        dispatch({
            type: DrawZoneStateActionType.SET_ORIGINAL_SIZE,
            payload: originalSize,
        })
        dispatch({
            type: DrawZoneStateActionType.FORCE_REDRAW,
        })
    }, [originalSize])

    useEffect(() => {
        if (sizeMode === 'auto') {
            setScale(logicalScale)
        } else if (containerRef.current && originalSize) {
            const rect = containerRef.current.getBoundingClientRect()

            const minWidth = Math.min(rect.width, originalSize.width)
            const minHeight = Math.min(rect.height, originalSize.height)

            if (
                originalSize.width <= minWidth &&
                originalSize.height <= minHeight
            ) {
                const maxWidth = Math.max(rect.width, originalSize.width)
                const maxHeight = Math.max(rect.height, originalSize.height)

                const coef = maxWidth / minWidth
                const coef2 = maxHeight / minHeight

                if (originalSize.height * coef <= maxHeight) {
                    setScale(coef * logicalScale)
                } else if (originalSize.width * coef2 <= maxWidth) {
                    setScale(coef2 * logicalScale)
                } else {
                    setScale(logicalScale)
                }
            } else if (
                minWidth < originalSize.width ||
                minHeight < originalSize.height
            ) {
                setScale(
                    Math.min(
                        minWidth / originalSize.width,
                        minHeight / originalSize.height,
                    ) * logicalScale,
                )
            }
        }
    }, [containerRef, originalSize, sizeMode, logicalScale])

    useEffect(() => {
        if (isTouchDevice) return

        const handleMouseEnter = () => setCanMarkerBeVisible(true)
        const handleMouseLeave = () => setCanMarkerBeVisible(false)

        if (svgRef.current) {
            svgRef.current.addEventListener('mouseenter', handleMouseEnter)
            svgRef.current.addEventListener('mouseleave', handleMouseLeave)
        }

        return () => {
            if (svgRef.current) {
                svgRef.current.removeEventListener(
                    'mouseenter',
                    handleMouseEnter,
                )
                svgRef.current.removeEventListener(
                    'mouseleave',
                    handleMouseLeave,
                )
            }
        }
    }, [])

    useEffect(() => {
        if (svgRef.current) {
            svgRef.current.style.top = `${positionTop}px`
            svgRef.current.style.left = `${positionLeft}px`
            svgRef.current.style.transform = 'none'
        }
    }, [positionTop, positionLeft])

    useEffect(() => {
        setForceRedraw(true)
    }, [mode, redraw])

    useLayoutEffect(() => {
        if (svg) {
            if (
                elements.length !==
                    svg.children().filter((c) => !c.attr('data-draw-ignore'))
                        .length ||
                forceRedraw
            ) {
                svg.clear()
                elements.forEach((element) => draw(element as ChangedElement))

                if (forceRedraw) setForceRedraw(false)
                return
            }
        }
    }, [svg, elements, forceRedraw, scale])

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
            }}
            ref={containerRef}
        >
            <div ref={svgRef}>
                {canMarkerBeVisible && isMarkerShown && (
                    <Marker src={src} svgRef={svgRef} />
                )}
                {children}
            </div>
        </div>
    )
}

type MarkerProps = {
    readonly src: string
    readonly svgRef: React.RefObject<HTMLDivElement>
}
function Marker({ src, svgRef }: MarkerProps): JSX.Element {
    const { clientX, clientY } = useMousePosition()

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
                    willChange: 'transform, background',
                }}
            />
        </>
    )
}
