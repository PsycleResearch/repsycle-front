import React, {
    useState,
    useEffect,
    useLayoutEffect,
    useRef,
    Dispatch,
    SetStateAction,
} from 'react'
import {
    SVG,
    Rect,
    Svg,
    Polygon,
    ArrayXY,
    Circle,
    Use,
    PointArrayAlias,
    FillData,
} from '@svgdotjs/svg.js'
import '@svgdotjs/svg.draggable.js'
import interact from 'interactjs'
import { DraggableOptions } from '@interactjs/types/index'
import { uuid4 } from '../helpers'
import { useMousePosition } from '../hooks'
import { isTouchDevice } from '../utils'
import { Polyline } from '@svgdotjs/svg.js'
import { StrokeData } from '@svgdotjs/svg.js'

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

const xns = 'http://www.w3.org/1999/xlink'
const blue = '#2BB1FD'
const defaultStroke = { color: '#fff', width: 2, opacity: 1 }
const defaultFill = { color: '#000', opacity: 0.2 }

function getRectCoords(rect: Rect) {
    const bbox = rect.bbox()
    return [
        { x: bbox.x, y: bbox.y },
        { x: bbox.x, y: bbox.y2 },
        { x: bbox.x2, y: bbox.y2 },
        { x: bbox.x2, y: bbox.y },
    ]
}

export function useDraw(
    ref: React.RefObject<HTMLElement>,
    src: string,
    props: {
        onChange: (elements: Array<ChangedElement>) => void
        remove: (id: string) => void
        disabled: boolean
        mode: DrawZoneMode
        scale: number
        drawOnMouseDown?: boolean
        showMarker: boolean
        setForceRedraw: Dispatch<SetStateAction<boolean>>
    },
) {
    const [svg, setSvg] = useState<Svg>()
    const [originalSize, setOriginalSize] = useState<Size>()
    let startPosition: Point | null
    let overlayRect: Rect | undefined
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

    function onChange() {
        if (svg && /*originalSize && */props.onChange) {
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
                                    x: p[0],// * originalSize.width,
                                    y: p[1],// * originalSize.height,
                                })),
                            )
                        } else {
                            const box = elt.bbox()
                            points = getAbsoluteCoordinates([
                                {
                                    x: box.x,// * originalSize.width,
                                    y: box.y,// * originalSize.height,
                                },
                                {
                                    x: box.x2,// * originalSize.width,
                                    y: box.y2,// * originalSize.height,
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
    }

    function onDelKeyPress(this: SVGElement, event: KeyboardEvent) {
        if (event.defaultPrevented) return
        if (event.key === 'Delete') {
            event.preventDefault()
            props.remove(this.dataset['id'] as string)
        }
    }

    function onEscKeyPress(this: SVGElement, event: KeyboardEvent) {
        if (event.defaultPrevented) return
        if (event.key === 'Escape') {
            event.preventDefault()
            this.dispatchEvent(new Event('deselect'))
        }
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

        window.removeEventListener('keydown', onAbortPathDrawing)
        window.removeEventListener('keydown', onEnterKeyPress)

        newPoly?.fire('select')

        onChange()
    }

    function onEnterKeyPress(this: Window, event: KeyboardEvent) {
        if (event.defaultPrevented) return
        if (event.key === 'Enter') {
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

            window.removeEventListener('keydown', onAbortPathDrawing)
            window.removeEventListener('keydown', onEnterKeyPress)
        }
    }

    const preventDrag = (event: DragEvent) => {
        event.preventDefault()
    }

    function drawRect({
        points,
        disabled = props.disabled ? true : false,
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

        const rectDelKeyPress = onDelKeyPress.bind(rect.node)
        const rectEscKeyPress = onEscKeyPress.bind(rect.node)

        let circle: Circle | undefined
        let handles: Use[] = []

        // Custom events.
        rect.on('select', () => {
            // Deselect all

            svg.each(function (this: Svg) {
                this.fire('deselect', { inst: rect })
            })
            rect.stroke({ color: blue })
            rect.data('selected', true)

            onChange()

            const coords = getRectCoords(rect)

            if (!disabled) {
                handles.forEach((h) => h.remove())
                handles.length = 0
                circle?.remove()
                circle = undefined
                window.addEventListener('keydown', rectDelKeyPress, {
                    once: true,
                })
                window.addEventListener('keydown', rectEscKeyPress, {
                    once: true,
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
            }
        })
        rect.on('deselect', (e) => {
            if ((e as any).detail?.inst === rect) return
            rect.stroke(stroke)
            rect.data('selected', false)

            interact('.point-handle').unset()
            handles.forEach((h) => h.remove())
            handles.length = 0
            circle?.remove()
            circle = undefined
            document.removeEventListener('dragstart', preventDrag)

            window.removeEventListener('keydown', rectDelKeyPress)
            window.removeEventListener('keydown', rectEscKeyPress)

            onChange()
        })

        if (!disabled) {
            rect.css('cursor', 'move')

            rect.on('click', (e: any) => {
                rect.fire('select')
            })
            rect.on('mousedown', (e: any) => {
                e.stopPropagation()
            })

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
                        },
                        move(event) {
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
                            handles.forEach((h) => h.show())
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
        disabled = props.disabled,
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

        let circles: Circle[] = []
        let handles: Use[] = []
        let rootMatrix: DOMMatrix

        const polyDelKeyPress = onDelKeyPress.bind(poly.node)
        const polyEscKeyPress = onEscKeyPress.bind(poly.node)

        // Custom events.
        poly.on('select', () => {
            if (poly.data('selected') === true) return
            // Deselect all

            svg.each(function (this: Svg) {
                this.fire('deselect', { inst: poly })
            })
            poly.stroke({ color: blue })
            poly.data('selected', true)
            window.addEventListener('keydown', polyDelKeyPress, { once: true })
            window.addEventListener('keydown', polyEscKeyPress, { once: true })

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

                    handle.on('mousedown', function mousedown(event) {
                        event.preventDefault()
                        event.stopPropagation()
                    })

                    circles.push(circle)
                    handles.push(handle)
                }

                interact('.point-handle')
                    .draggable({
                        onstart: function (event) {
                            svg.node.setAttribute('class', 'dragging')
                        },
                        onmove: function (event) {
                            const i =
                                event.target.getAttribute('data-index') | 0
                            const point = poly.node.points.getItem(i)

                            point.x += event.dx / rootMatrix.a
                            point.y += event.dy / rootMatrix.d

                            event.target.x.baseVal.value = point.x
                            event.target.y.baseVal.value = point.y
                        },
                        onend: function (event) {
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

                document.addEventListener('dragstart', preventDrag)
            }

            onChange()
        })
        poly.on('deselect', (e) => {
            if ((e as any).detail?.inst === poly) return
            poly.stroke(stroke)
            poly.data('selected', false)

            interact('.point-handle').unset()
            handles.forEach((h) => h.remove())
            handles.length = 0
            circles.forEach((circle) => circle.remove())
            circles.length = 0
            document.removeEventListener('dragstart', preventDrag)

            window.removeEventListener('keydown', polyDelKeyPress)
            window.removeEventListener('keydown', polyEscKeyPress)

            onChange()
        })

        if (!disabled) {
            poly.css('cursor', 'move')

            poly.on('click', (e: Event) => {
                poly.fire('select')
            })

            poly.on('mousedown', (e: Event) => {
                e.stopPropagation()
            })

            interact(poly.node).draggable({
                listeners: {
                    start(event) {
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
                    end(event) {
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

                            handle.on('mousedown', function mousedown(event) {
                                event.preventDefault()
                                event.stopPropagation()
                            })

                            circles.push(newCircle)
                            handles.push(handle)
                        }
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
                    x: point.x,// / originalSize.width,
                    y: point.y,// / originalSize.height,
                } as Point),
        )

        if (points.length === 2) drawRect({ points, id, fill, stroke, label })
        else drawPoly({ points, id, fill, stroke, label })
    }

    function onMouseDown(e: globalThis.MouseEvent) {
        if (e.defaultPrevented) return
        if (!svg) return

        if (props.mode === 'draw' && !props.disabled) {
            const svgRect = svg.node.getBoundingClientRect()

            startPosition = {
                x: e.clientX - svgRect.left,
                y: e.clientY - svgRect.top,
            }

            if (!overlayRect) {
                overlayRect = svg
                    .rect(0, 0)
                    .fill({ opacity: 0.2 })
                    .stroke({ color: '#000', width: 2, opacity: 0.5 })
            }

            overlayRect.move(
                startPosition.x / svgRect.width,
                startPosition.y / svgRect.height,
            )

            e.preventDefault()
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

        if (props.mode === 'draw' && !props.disabled) {
            if (!svg.node.contains(e.target as Node)) {
                overlayRect = undefined
                return
            }

            if (overlayRect) {
                const svgRect = svg.node.getBoundingClientRect()

                const currentPosition: Point = {
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
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

    function onMouseUp(e: globalThis.MouseEvent) {
        if (e.defaultPrevented) return
        if (!svg) return

        if (props.mode === 'draw' && !props.disabled) {
            if (!startPosition) {
                return
            }

            if (overlayRect) {
                overlayRect.remove()
                overlayRect = undefined
            }

            // Prevent drawing new rect on rect dragend...

            if ((e.target as Node | null)?.parentNode === svg.node) {
                return
            }

            const svgRect = svg.node.getBoundingClientRect()
            const currentPosition = {
                x: e.clientX - svgRect.left,
                y: e.clientY - svgRect.top,
            }

            // Prevent adding very small rects (mis-clicks).
            if (Math.abs(currentPosition.x - startPosition.x) <= 2) {
                if (props.drawOnMouseDown) {
                    currentPosition.x = startPosition.x + 50
                    currentPosition.y = startPosition.y + 50
                } else {
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

            newRect?.data('selected', true)
            newRect?.fire('select')

            onChange()
        } else if (props.mode === 'move' && dragging) {
            const parent = svg.parent()

            if (parent) {
                const grandParent = parent.parent()

                if (grandParent) {
                    const parentRect = grandParent.node.getBoundingClientRect()
                    const svgRect = parent.node.getBoundingClientRect()

                    parent.css({
                        left: `${svgRect.left - parentRect.left}px`,
                        top: `${svgRect.top - parentRect.top}px`,
                        transform: 'none',
                    })

                    svg.css({ cursor: 'grab' })

                    dragging = false
                }
            }
        }

        if (props.mode !== 'path') startPosition = null
    }

    function onClick(e: globalThis.MouseEvent) {
        if (e.defaultPrevented) return
        if (!svg) return

        // If click on main svg, and not an element, deselect everything.
        if (e.target === svg.node) {
            svg.each(function (this: Svg) {
                this.fire('deselect')
            })
            onChange()
        }

        if (
            svg.children().filter((c) => c.data('selected') === true).length ===
                0 &&
            props.mode === 'path'
        ) {
            const svgRect = svg.node.getBoundingClientRect()

            if (!tmpPoly) {
                startPosition = {
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                }

                tmpPoints = [drawPoint(svg, startPosition.x, startPosition.y)]

                window.addEventListener('keydown', onAbortPathDrawing)
                window.addEventListener('keydown', onEnterKeyPress)
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

                    window.removeEventListener('keydown', onAbortPathDrawing)
                    window.removeEventListener('keydown', onEnterKeyPress)

                    poly?.data('selected', true)
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
                            opacity: 0.2,
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
        }
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
        ref.current.style.left = '0'
        ref.current.style.top = '0'

        if (svg) {
            svg.node.remove()
        }

        const newSvg = SVG().addTo(ref.current).size('100%', '100%').attr({
            'xmlns:xlink': xns,
        })

        setSvg(newSvg)
    }, [ref, src])

    useEffect(() => {
        if (ref.current && originalSize && props.scale) {
            ref.current.style.width = `${originalSize.width * props.scale}px`

            ref.current.style.height = `${originalSize.height * props.scale}px`

            if (svg) {
                props.setForceRedraw(true)
            }
        }
    }, [ref, originalSize, props.scale])

    useLayoutEffect(() => {
        if (!svg) {
            return
        }

        svg.css({
            cursor:
                props.mode === 'move' && !props.disabled
                    ? 'grab'
                    : props.mode === 'none' && !props.showMarker
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
            })
        }

        svg.on('mousedown', onMouseDown as unknown as EventListener)
        svg.on('mouseup', onMouseUp as unknown as EventListener)
        svg.on('click', onClick as unknown as EventListener)
        window.addEventListener('mousemove', onMouseMove)

        return () => {
            svg.off('mousedown', onMouseDown as unknown as EventListener)
            svg.off('mouseup', onMouseUp as unknown as EventListener)
            svg.off('click', onClick as unknown as EventListener)
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
    children?: React.ReactNode
    src: string
    elements: Partial<ChangedElement>[]
    onChange: (elements: ChangedElement[]) => void
    remove: (id: string) => void
    disabled?: boolean
    mode: DrawZoneMode
    scale: number
    drawOnMouseDown?: boolean
    showMarker?: boolean
    setOriginalSize: Dispatch<SetStateAction<Size | undefined>>
    sizeMode?: SizeMode
    redraw?: boolean
}

export default function DrawZone({
    src,
    elements,
    onChange,
    remove,
    children,
    disabled = false,
    mode = 'draw',
    scale,
    drawOnMouseDown,
    showMarker = false,
    setOriginalSize,
    sizeMode = 'auto',
    redraw = false,
}: DrawZoneProps): JSX.Element {
    const svgRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [forceRedraw, setForceRedraw] = useState(false)
    const [computedScale, setComputedScale] = useState(scale)
    const { svg, draw, originalSize } = useDraw(svgRef, src, {
        onChange,
        remove,
        disabled,
        mode,
        scale: computedScale,
        drawOnMouseDown,
        showMarker,
        setForceRedraw,
    })
    const { clientX, clientY } = useMousePosition()
    const [canMarkerBeVisible, setCanMarkerBeVisible] = useState(false)

    useEffect(() => {
        if (sizeMode === 'auto') {
            setComputedScale(scale)
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
                    setComputedScale(coef * scale)
                } else if (originalSize.width * coef2 <= maxWidth) {
                    setComputedScale(coef2 * scale)
                } else {
                    setComputedScale(scale)
                }
            } else if (
                minWidth < originalSize.width ||
                minHeight < originalSize.height
            ) {
                setComputedScale(
                    Math.min(
                        minWidth / originalSize.width,
                        minHeight / originalSize.height,
                    ) * scale,
                )
            }
        }
    }, [containerRef, originalSize, sizeMode, scale])

    useEffect(() => {
        setOriginalSize(originalSize)
    }, [originalSize])

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
    }, [svg, elements, forceRedraw])

    const width = svgRef.current?.getBoundingClientRect().width
    const height = svgRef.current?.getBoundingClientRect().height
    const left = clientX - (svgRef.current?.getBoundingClientRect().left || 0)
    const top = clientY - (svgRef.current?.getBoundingClientRect().top || 0)

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
                {canMarkerBeVisible && showMarker && (
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
                )}
                {children}
            </div>
        </div>
    )
}
