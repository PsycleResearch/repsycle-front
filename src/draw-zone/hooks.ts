import {
    ArrayXY,
    Circle,
    FillData,
    LinkedHTMLElement,
    PointArrayAlias,
    Polygon,
    Polyline,
    Rect,
    SVG,
    StrokeData,
    Svg,
    Use,
} from '@svgdotjs/svg.js'
import interact from 'interactjs'
import {
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useState,
} from 'react'
import { uuid4 } from '../helpers'
import { isTouchDevice } from '../utils'
import { DrawZoneContext } from './state'
import {
    ChangedElement,
    DrawZoneMode,
    DrawZoneShape,
    DrawZoneState,
    DrawZoneStateActionType,
    Point,
    Size,
} from './types'

const xns = 'http://www.w3.org/1999/xlink'
const blue = '#2BB1FD'
const defaultStroke = { color: '#fff', width: 2, opacity: 1 }
const defaultFill = { color: '#000', opacity: 0 }

const CIRCLE_SIZE = isTouchDevice ? 22 : 10

function getAbsoluteCoordinates(svg: Svg, points: Point[]) {
    const svgRect = svg.node.getBoundingClientRect()

    return points.map(({ x, y }) => ({
        x: x / svgRect.width,
        y: y / svgRect.height,
    }))
}

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

export function useDraw(
    ref: React.RefObject<HTMLElement>,
    src: string,
    props: {
        readonly onChange: (elements: Array<ChangedElement>) => void
        readonly remove: (id: string) => void
        readonly mode: DrawZoneMode
        readonly shape: DrawZoneShape
        readonly drawOnMouseDown?: boolean
        readonly initialRect?: ChangedElement
        readonly onInitialRectChange?: (
            arg: Pick<ChangedElement, 'id' | 'label' | 'rect'>,
        ) => void
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

    const convertForOnChange = useCallback(
        function convertForOnChange(): ChangedElement[] {
            if (!svg) {
                return []
            }

            const svgRect = svg.node.getBoundingClientRect()

            return svg
                .children()
                .filter((e) => !e.attr('data-draw-ignore'))
                .map((elt) => {
                    const elementRect = elt.node.getBoundingClientRect()

                    const rect: ChangedElement['rect'] = {
                        height: (elementRect.height / svgRect.height) * 100,
                        width: (elementRect.width / svgRect.width) * 100,
                        x: ((elementRect.x - svgRect.x) / svgRect.width) * 100,
                        y: ((elementRect.y - svgRect.y) / svgRect.height) * 100,
                    }

                    const polygon = elt as Polygon
                    const points: Point[] = getAbsoluteCoordinates(
                        svg,
                        polygon
                            .plot()
                            .map((p) => ({
                                x: p[0],
                                y: p[1],
                            }))
                            .filter(
                                (_, index) =>
                                    props.shape === 'poly' || index % 2 === 0,
                            ),
                    )

                    const result = {
                        points,
                        rect,
                        label: elt.data('label'),
                        selected: elt.data('selected') as boolean,
                        id: elt.data('id'),
                        color: elt.data('color'),
                    }

                    return result
                })
        },
        [svg],
    )

    function onChange() {
        props.onChange(convertForOnChange())
    }

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
        const minX = Math.min(points[0].x, points[1].x)
        const minY = Math.min(points[0].y, points[1].y)
        const maxX = Math.max(points[0].x, points[1].x)
        const maxY = Math.max(points[0].y, points[1].y)

        const newPoints: Point[] = [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY },
        ]

        return drawPoly({
            points: newPoints,
            disabled,
            stroke,
            fill,
            label,
            id,
        })
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
        stroke?: StrokeData
        fill?: FillData
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

        let rootMatrix: DOMMatrix
        const circles: Circle[] = []
        const handles: Use[] = []

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

                        if (props.shape === 'rect') {
                            switch (i) {
                                case 0: // top left
                                    handles[0].x(point.x)
                                    handles[0].y(point.y)
                                    handles[1].y(point.y)
                                    handles[3].x(point.x)
                                    break
                                case 1: // top right
                                    handles[1].x(point.x)
                                    handles[1].y(point.y)
                                    handles[2].x(point.x)
                                    handles[0].y(point.y)
                                    break
                                case 2: // bottom right
                                    handles[2].x(point.x)
                                    handles[2].y(point.y)
                                    handles[3].y(point.y)
                                    handles[1].x(point.x)
                                    break
                                case 3: // bottom left
                                    handles[3].x(point.x)
                                    handles[3].y(point.y)
                                    handles[0].x(point.x)
                                    handles[2].y(point.y)
                                    break
                            }

                            const newPlot = handles.map(
                                (h) =>
                                    [Number(h.x()), Number(h.y())] as ArrayXY,
                            )
                            poly.plot(newPlot)
                        } else {
                            event.target.x.baseVal.value = point.x
                            event.target.y.baseVal.value = point.y
                        }
                    },
                    onend: function (event) {
                        event.target.instance.css('cursor', 'grab')
                        svg.css('cursor', 'crosshair')

                        const index = Number(
                            event.target.getAttribute('data-index') || 0,
                        )

                        if (props.shape === 'poly') {
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
                        }

                        svg.node.setAttribute('class', '')

                        onChange()
                    },
                    modifiers: [
                        interact.modifiers.restrict({
                            restriction: 'parent',
                        }),
                    ],
                })
                .styleCursor(false)
        }

        function cleanHandles() {
            interact('.point-handle').unset()
            handles.forEach((h) => h.remove())
            handles.length = 0
            circles.forEach((circle) => circle.remove())
            circles.length = 0
            document.removeEventListener('dragstart', preventDrag)
        }

        function createHandles(svg: Svg) {
            rootMatrix = svg.node.getScreenCTM() as DOMMatrix

            for (let i = 0; i < poly.node.points.numberOfItems; i++) {
                const point = poly.node.points.getItem(i)

                const handleId = `point-handle-${i}`

                const circle = svg
                    .defs()
                    .attr('data-draw-ignore', true)
                    .circle(CIRCLE_SIZE)
                    .center(0, 0)
                    .fill({ opacity: 1, color: blue })
                    .stroke({ width: 1, color: '#fff' })
                    .css('touch-action', 'none') // silence interactjs warning.
                    .id(handleId)

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
                cleanHandles()
                createHandles(svg)
            }

            onChange()
        })
        poly.on('deselect', (e) => {
            if ((e as CustomEvent).detail?.inst === poly) return
            poly.stroke(stroke)
            poly.data('selected', false)

            cleanHandles()

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
                        cleanHandles()
                    },
                    move(event) {
                        const x = parseFloat(event.target.instance.x())
                        const y = parseFloat(event.target.instance.y())

                        event.target.instance.x(x + event.dx)
                        event.target.instance.y(y + event.dy)

                        onChange()
                    },
                    end() {
                        createHandles(svg)
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
        const delta = CIRCLE_SIZE / 2

        const point = svg
            .circle(CIRCLE_SIZE)
            .center(0, 0)
            .fill({ opacity: 1, color: '#f06' })
            .stroke({ width: 1, color: '#fff' })
            .attr('data-draw-ignore', true)
            .addClass('tmp-point')
            .move(x - delta, y - delta)
            .css('touch-action', 'none') // silence interactjs warning.

        point.on('pointerdown', function (event) {
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
    }: ChangedElement) => {
        const fill = color ? { ...defaultFill, color } : defaultFill
        const stroke = color ? { ...defaultStroke, color } : defaultStroke

        const points =
            inputPoints?.map(
                (point) =>
                    ({
                        x: point.x,
                        y: point.y,
                    } as Point),
            ) ?? []

        if (points.length === 2) drawRect({ points, id, fill, stroke, label })
        else drawPoly({ points, id, fill, stroke, label })
    }

    function onPointerDown(e: globalThis.PointerEvent) {
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

            if (props.shape === 'poly' && !isDisabled) {
                if (!tmpPoints) {
                    startPosition = {
                        x: e.clientX - svgRect.left,
                        y: e.clientY - svgRect.top,
                    }

                    tmpPoints = [
                        drawPoint(svg, startPosition.x, startPosition.y),
                    ]

                    window.addEventListener('keyup', onAbortPathDrawing, {
                        capture: true,
                    })
                    window.addEventListener('keyup', onEnterKeyPress, {
                        capture: true,
                    })
                } else if (startPosition && Array.isArray(tmpPoints)) {
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

                        window.removeEventListener(
                            'keyup',
                            onAbortPathDrawing,
                            {
                                capture: true,
                            },
                        )
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

                        tmpPoints.push(
                            drawPoint(
                                svg,
                                currentPosition.x,
                                currentPosition.y,
                            ),
                        )

                        tmpPoints.forEach((p) => p.front())

                        startPosition = currentPosition
                    }
                }
            } else {
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

    function onPointerMove(this: Window, e: globalThis.PointerEvent) {
        if (e.defaultPrevented) return
        if (!svg || !startPosition) return

        if (props.mode === 'draw' && !isDisabled) {
            if (props.shape === 'poly' && !isTouchDevice) {
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
            } else if (overlayRect && overlayRect2) {
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
        }
    }

    function onPointerUp(this: Window, e: globalThis.PointerEvent) {
        if (e.defaultPrevented) return
        if (!svg) return

        if (props.mode === 'draw' && props.shape === 'rect' && !isDisabled) {
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

            let label = undefined
            // Prevent adding very small rects (mis-clicks).
            if (Math.abs(currentPosition.x - startPosition.x) <= 2) {
                const elements = convertForOnChange()
                let lastRect = elements[elements.length - 1]

                if (props.initialRect) {
                    lastRect = props.initialRect
                }

                label = lastRect?.label

                if (props.drawOnMouseDown && lastRect && lastRect.rect) {
                    currentPosition.x = Math.min(
                        startPosition.x +
                            (lastRect.rect.width * svgRect.width) / 100,
                        svgRect.width,
                    )
                    currentPosition.y = Math.min(
                        startPosition.y +
                            (lastRect.rect.height * svgRect.height) / 100,
                        svgRect.height,
                    )
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
                label: label,
            })

            if (newRect && props.onInitialRectChange) {
                const elementRect = newRect.node.getBoundingClientRect()
                const rect: ChangedElement['rect'] = {
                    height: (elementRect.height / svgRect.height) * 100,
                    width: (elementRect.width / svgRect.width) * 100,
                    x: ((elementRect.x - svgRect.x) / svgRect.width) * 100,
                    y: ((elementRect.y - svgRect.y) / svgRect.height) * 100,
                }
                props.onInitialRectChange({
                    rect: rect,
                    label: newRect.data('label'),
                    id: newRect.data('id'),
                })
            }

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

        if (
            props.mode !== 'draw' ||
            (props.mode === 'draw' && props.shape !== 'poly')
        )
            startPosition = null
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

        svg.on('pointerdown', onPointerDown as unknown as EventListener)
        window.addEventListener('pointerup', onPointerUp)
        window.addEventListener('pointermove', onPointerMove)

        return () => {
            svg.off('pointerdown', onPointerDown as unknown as EventListener)
            window.removeEventListener('pointerup', onPointerUp)
            window.removeEventListener('pointermove', onPointerMove)
        }
    }, [svg, props.mode, props.initialRect])

    return {
        svg,
        draw,
        originalSize,
    }
}
