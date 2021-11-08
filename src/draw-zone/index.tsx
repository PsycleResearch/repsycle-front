import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import {
    SVG,
    Rect,
    Svg,
    Polygon,
    Polyline,
    ArrayXY,
    Circle,
    Use,
} from '@svgdotjs/svg.js'
import '@svgdotjs/svg.draggable.js'
import interact from 'interactjs'
import { DraggableOptions } from '@interactjs/types/index'
import { uuid4 } from '../helpers'
import { useMousePosition } from '../hooks'
import { isTouchDevice } from '../utils'

export type DrawZoneMode = 'draw' | 'path' | 'move'

interface Size {
    readonly width: number
    readonly height: number
}
interface Point {
    readonly x: number
    readonly y: number
}
export interface ChangedElement {
    readonly id: string
    readonly selected: boolean
    readonly points: Point[]
    readonly rect: {
        readonly height: number
        readonly width: number
        readonly x: number
        readonly y: number
    }
}

const xns = 'http://www.w3.org/1999/xlink'
const blue = '#2BB1FD'

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
    },
) {
    const [svg, setSvg] = useState<Svg>()
    const [originalSize, setOriginalSize] = useState<Size>()
    let startPosition: Point | null
    let overlayRect: Rect | undefined
    let poly: Polyline | undefined
    let tmpPoly: Polyline | undefined
    let dragging: boolean

    function onChange() {
        if (svg && props.onChange) {
            props.onChange(
                svg
                    .children()
                    .filter((e) => !e.attr('data-draw-ignore'))
                    .map((elt) => {
                        const svgRect = svg.node.getBoundingClientRect()
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

                        if (elt instanceof Polygon) {
                            const polygon = elt as Polygon

                            return {
                                points: polygon.plot().map((p) => ({
                                    x: p[0] / 100,
                                    y: p[1] / 100,
                                })),
                                rect: rect,
                                selected: polygon.data('selected') as boolean,
                                id: polygon.data('id'),
                            }
                        }

                        const box = elt.bbox()
                        return {
                            points: [
                                { x: box.x / 100, y: box.y / 100 },
                                { x: box.x2 / 100, y: box.y2 / 100 },
                            ],
                            rect: rect,
                            selected: elt.data('selected') as boolean,
                            id: elt.data('id'),
                        }
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

    function onAbortPathDrawing(this: Window, event: KeyboardEvent) {
        if (event.defaultPrevented) return
        if (event.key === 'Escape') {
            event.preventDefault()

            if (tmpPoly) {
                tmpPoly.remove()
                tmpPoly = undefined
            }

            if (poly) {
                poly.remove()
                poly = undefined
            }

            startPosition = null
        }
    }

    const preventDrag = (event: DragEvent) => {
        event.preventDefault()
    }

    function drawRect({
        points,
        disabled = props.disabled ? true : false,
        stroke = { color: '#fff', width: 2, opacity: 1 },
        fill = { color: '#000', opacity: 0.2 },
        id = null,
    }: {
        points: Point[]
        disabled?: boolean
        stroke?: object
        fill?: object
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

        let circle: Circle
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
                window.addEventListener('keydown', rectDelKeyPress, {
                    once: true,
                })

                circle = svg
                    .defs()
                    .attr('data-draw-ignore', true)
                    .circle(3)
                    .center(0, 0)
                    .fill({ opacity: 1, color: blue })
                    .stroke({ width: 1, color: '#fff' })
                    .id('point-handle')

                for (let i = 0; i < coords.length; i++) {
                    const point = coords[i]
                    const handle = svg
                        .use(circle as Circle)
                        .attr('pointer-events', 'none')
                        .css('pointerEvents', 'none')
                        .attr('href', '#point-handle', xns)
                        .addClass('point-handle')
                        .data('draw-ignore', true)
                        .x(point.x)
                        .y(point.y)
                        .data('index', i)

                    handles.push(handle)
                }
            }
        })
        rect.on('deselect', (e) => {
            if ((e as any).detail?.inst === rect) return
            rect.stroke(stroke)
            rect.data('selected', false)

            circle?.remove()
            interact('.point-handle').unset()
            handles.forEach((h) => h.remove())
            document.removeEventListener('dragstart', preventDrag)

            window.removeEventListener('keydown', rectDelKeyPress)

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
                            handles.forEach((h) => h.remove())

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
                            handles.forEach((h) => h.remove())
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

        return rect
    }

    function drawPoly({
        points,
        disabled = props.disabled,
        stroke = { color: '#fff', width: 2, opacity: 1 },
        fill = { color: '#000', opacity: 0.2 },
        id = null,
    }: {
        points: Point[]
        disabled?: boolean
        stroke?: { color: string; width: number; opacity: number }
        fill?: { color: string; opacity: number }
        id?: string | null
    }) {
        if (!svg || !points || points.length < 2) {
            return
        }

        const poly = svg.polygon(
            points.map((point) => [point.x * 100, point.y * 100]),
        )

        poly.fill(fill)
        poly.stroke(stroke)
        poly.css('touch-action', 'none') // silence interactjs warning.

        let circle: Circle
        let handles: Use[] = []
        let rootMatrix: DOMMatrix

        const polyDelKeyPress = onDelKeyPress.bind(poly.node)

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

            if (!disabled) {
                handles.forEach((h) => h.remove())
                handles.length = 0
                rootMatrix = svg.node.getScreenCTM() as DOMMatrix

                circle = svg
                    .defs()
                    .attr('data-draw-ignore', true)
                    .circle(3)
                    .center(0, 0)
                    .fill({ opacity: 1, color: blue })
                    .stroke({ width: 1, color: '#fff' })
                    .id('point-handle')

                for (let i = 0; i < poly.node.points.numberOfItems; i++) {
                    const point = poly.node.points.getItem(i)
                    const handle = svg
                        .use(circle as Circle)
                        .attr('href', '#point-handle', xns)
                        .addClass('point-handle')
                        .data('draw-ignore', true)
                        .x(point.x)
                        .y(point.y)
                        .data('index', i)

                    handle.on('mousedown', function mousedown(event) {
                        event.preventDefault()
                        event.stopPropagation()
                    })

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

            circle?.remove()
            interact('.point-handle').unset()
            handles.forEach((h) => h.remove())
            document.removeEventListener('dragstart', preventDrag)

            window.removeEventListener('keydown', polyDelKeyPress)

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
                            ((x + event.dx) / svgRect.width) * 100,
                        )
                        event.target.instance.y(
                            ((y + event.dy) / svgRect.height) * 100,
                        )

                        onChange()
                    },
                    end(event) {
                        for (
                            let i = 0;
                            i < poly.node.points.numberOfItems;
                            i++
                        ) {
                            const point = poly.node.points.getItem(i)
                            const handle = svg
                                .use(circle as Circle)
                                .attr('href', '#point-handle', xns)
                                .addClass('point-handle')
                                .data('draw-ignore', true)
                                .x(point.x)
                                .y(point.y)
                                .data('index', i)

                            handle.on('mousedown', function mousedown(event) {
                                event.preventDefault()
                                event.stopPropagation()
                            })

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

        return poly
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

            const currentPosition = {
                x: e.clientX,
                y: e.clientY,
            }
            const translationX = currentPosition.x - startPosition.x
            const translationY = currentPosition.y - startPosition.y

            const parent = svg.parent()

            if (parent)
                parent.css(
                    'transform',
                    `translate(${translationX}px, ${translationY}px)`,
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
                : [
                      [
                          (startPosition.x / svgRect.width) * 100,
                          (startPosition.y / svgRect.height) * 100,
                      ] as ArrayXY,
                  ]

            tmpPoly = svg
                .polyline([
                    ...prev,
                    [
                        (currentPosition.x / svgRect.width) * 100,
                        (currentPosition.y / svgRect.height) * 100,
                    ],
                ])
                .fill('none')
                .stroke({
                    color: '#f06',
                    width: 4,
                    linecap: 'round',
                    linejoin: 'round',
                })
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

            drawRect({
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

                window.addEventListener('keydown', onAbortPathDrawing, {
                    once: true,
                })
            } else if (startPosition && tmpPoly) {
                const currentPosition = {
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                }

                const prev = poly
                    ? [...poly.plot()]
                    : [
                          [
                              (startPosition.x / svgRect.width) * 100,
                              (startPosition.y / svgRect.height) * 100,
                          ] as ArrayXY,
                      ]

                if (poly) {
                    poly.remove()
                    poly = undefined
                }

                const start = prev[0]
                if (
                    prev.length > 2 &&
                    Math.abs(
                        (currentPosition.x / svgRect.width) * 100 - start[0],
                    ) <= 10 &&
                    Math.abs(
                        (currentPosition.y / svgRect.height) * 100 - start[1],
                    ) <= 10
                ) {
                    if (tmpPoly) {
                        tmpPoly.remove()
                        tmpPoly = undefined
                    }

                    startPosition = null

                    drawPoly({
                        points: prev.map(([x, y]) => ({
                            x: x / 100,
                            y: y / 100,
                        })),
                    })

                    window.removeEventListener('keydown', onAbortPathDrawing)

                    onChange()
                } else {
                    poly = svg
                        .polyline([
                            ...prev,
                            [
                                (currentPosition.x / svgRect.width) * 100,
                                (currentPosition.y / svgRect.height) * 100,
                            ],
                        ])
                        .hide()

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

        if (svg) {
            svg.node.remove()
        }

        const newSvg = SVG()
            .addTo(ref.current)
            .size('100%', '100%')
            .viewbox(0, 0, 100, 100)
            .attr({
                preserveAspectRatio: 'none',
                'xmlns:xlink': xns,
            })

        setSvg(newSvg)
    }, [ref, src])

    useEffect(() => {
        if (ref.current && originalSize && props.scale) {
            ref.current.style.width = `${originalSize.width * props.scale}px`

            ref.current.style.height = `${originalSize.height * props.scale}px`
        }
    }, [ref, originalSize, props.scale])

    useLayoutEffect(() => {
        if (!svg) {
            return
        }

        svg.css({
            cursor:
                props.mode === 'draw' && !props.disabled ? 'crosshair' : 'grab',
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
        draw: ({ points, id }: { points: Array<Point>; id: string }) => {
            if (points.length === 2) drawRect({ points, id })
            else drawPoly({ points, id })
        },
    }
}

export interface DrawZoneProps {
    children: React.ReactNode
    src: string
    elements: Partial<ChangedElement>[]
    onChange: (elements: ChangedElement[]) => void
    remove: (id: string) => void
    disabled?: boolean
    mode: DrawZoneMode
    scale: number
    drawOnMouseDown?: boolean
    showMarker?: boolean
    forceDraw: boolean
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
    forceDraw,
}: DrawZoneProps): JSX.Element {
    const svgRef = useRef<HTMLDivElement>(null)
    const { svg, draw } = useDraw(svgRef, src, {
        onChange,
        remove,
        disabled,
        mode,
        scale,
        drawOnMouseDown,
    })
    const { clientX, clientY } = useMousePosition()
    const [canMarkerBeVisible, setCanMarkerBeVisible] = useState(false)

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

    useLayoutEffect(() => {
        if (svg) {
            if (
                elements.length !==
                    svg.children().filter((c) => !c.attr('data-draw-ignore'))
                        .length ||
                forceDraw
            ) {
                console.log('layout')
                svg.clear()
                elements.forEach((element) => draw(element as ChangedElement))
                return
            }

            // Selectively redraw elements.
            // svg.children().forEach(child => {
            //     // Strange bug, can't use find
            //     const element = elements.filter(elt => elt.id === child.data('id'))[0];
            //     if (element && element.stroke !== child.stroke()) {
            //         child.remove();
            //         draw(element);
            //     }
            // });
        }
    }, [svg, elements, forceDraw])

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                backgroundColor: '#eee',
                position: 'relative',
            }}
        >
            <div ref={svgRef}>
                {canMarkerBeVisible && showMarker && (
                    <>
                        <div
                            style={{
                                position: 'absolute',
                                top: '0',
                                bottom: '0',
                                left:
                                    clientX -
                                    (svgRef.current?.getBoundingClientRect()
                                        .left || 0),
                                width: '1px',
                                backgroundColor: 'black',
                                zIndex: 20,
                                pointerEvents: 'none',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                left: '0',
                                right: '0',
                                top:
                                    clientY -
                                    (svgRef.current?.getBoundingClientRect()
                                        .top || 0),
                                height: '1px',
                                backgroundColor: 'black',
                                zIndex: 20,
                                pointerEvents: 'none',
                            }}
                        />
                    </>
                )}
                {children}
            </div>
        </div>
    )
}
