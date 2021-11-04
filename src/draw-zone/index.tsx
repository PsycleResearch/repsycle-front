import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { SVG, Rect, Svg, Polygon, Polyline, ArrayXY } from '@svgdotjs/svg.js'
import '@svgdotjs/svg.draggable.js'
import interact from 'interactjs'
import { uuid4 } from '../helpers'
import { useMousePosition } from '../hooks'
import { isTouchDevice } from '../utils'

export type DrawZoneMode = 'draw' | 'path' | 'move'

interface Size {
    width: number
    height: number
}
interface Point {
    x: number
    y: number
}
export interface ChangedElement {
    id: string
    selected: boolean
    points: Point[]
}

export function useDraw(
    ref: React.RefObject<HTMLElement>,
    src: string,
    props: {
        onChange: (elements: Array<ChangedElement>) => void
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

    function getRelativeCoordinates(points: Point[]): Point[] {
        if (!svg) return points

        const svgRect = svg?.node.getBoundingClientRect()

        return points.map(({ x, y }) => ({
            x: x * svgRect.width,
            y: y * svgRect.height,
        }))
    }

    function getAbsoluteCoordinates(points: Point[]) {
        if (!svg) return points

        const svgRect = svg.node.getBoundingClientRect()

        return points.map(({ x, y }) => ({
            x: x / svgRect.width,
            y: y / svgRect.height,
        }))
    }

    function onChange() {
        if (svg && props.onChange) {
            props.onChange(
                svg
                    .children()
                    .filter((e) => !e.attr('data-marker'))
                    .map((elt) => {
                        console.log(
                            'instance',
                            elt instanceof Rect,
                            elt instanceof Polyline,
                        )
                        if (elt instanceof Polyline) {
                            const polyline = elt as Polyline

                            return {
                                points: getAbsoluteCoordinates(
                                    polyline
                                        .plot()
                                        .map((p) => ({ x: p[0], y: p[1] })),
                                ),
                                selected: polyline.data('selected') as boolean,
                                id: polyline.data('id'),
                            }
                        }

                        const box = elt.bbox()
                        return {
                            points: getAbsoluteCoordinates([
                                { x: box.x, y: box.y },
                                { x: box.x2, y: box.y2 },
                            ]),
                            selected: elt.data('selected') as boolean,
                            id: elt.data('id'),
                        }
                    }),
            )
        }
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

        // Custom events.
        rect.on('select', () => {
            // Deselect all

            svg.each(function (this: Svg) {
                this.fire('deselect')
            })
            rect.stroke({ color: '#02A9C7' })
            rect.data('selected', true)

            onChange()
        })
        rect.on('deselect', () => {
            rect.stroke(stroke)
            rect.data('selected', false)

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
        if (!svg || !points || points.length < 2) {
            return
        }

        const poly = svg.polygon(
            /*gon*/ points.map((point) => [point.x, point.y]),
            //points.map((p) => `${p.x * 100}%,${p.y * 100}%`).join(' '),
        )

        poly.move(points[0].x * 100, points[0].y * 100)

        poly.fill(fill)
        poly.stroke(stroke)
        poly.css('touch-action', 'none') // silence interactjs warning.

        poly.width(100)
        poly.height(100)

        // Custom events.
        poly.on('select', () => {
            // Deselect all

            svg.each(function (this: Svg) {
                this.fire('deselect')
            })
            poly.stroke({ color: '#02A9C7' })
            poly.data('selected', true)

            onChange()
        })
        poly.on('deselect', () => {
            poly.stroke(stroke)
            poly.data('selected', false)

            onChange()
        })

        if (!disabled) {
            poly.css('cursor', 'move')

            poly.on('click', (e: any) => {
                poly.fire('select')
            })
            poly.on('mousedown', (e: any) => {
                e.stopPropagation()
            })
        }

        poly.data('disabled', disabled)
        poly.data('id', id || uuid4())

        return poly
    }

    function onMouseDown(e: any) {
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

            overlayRect.move(startPosition.x, startPosition.y)
        } else if (props.mode === 'move') {
            startPosition = {
                x: e.clientX,
                y: e.clientY,
            }
            dragging = true

            svg.css({
                cursor: 'grabbing',
            })
        }
    }

    function onMouseMove(e: any) {
        if (!svg || !startPosition) return

        if (props.mode === 'draw' && !props.disabled) {
            if (!svg.node.contains(e.target)) {
                overlayRect = undefined
                return
            }

            if (overlayRect) {
                const svgRect = svg.node.getBoundingClientRect()

                const currentPosition: Point = {
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                }

                overlayRect.move(
                    currentPosition.x > startPosition.x
                        ? startPosition.x
                        : currentPosition.x,
                    currentPosition.y > startPosition.y
                        ? startPosition.y
                        : currentPosition.y,
                )
                overlayRect.width(Math.abs(currentPosition.x - startPosition.x))
                overlayRect.height(
                    Math.abs(currentPosition.y - startPosition.y),
                )
            }
        } else if (props.mode === 'move' && dragging) {
            if (!svg.node.contains(e.target)) {
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
                : [[startPosition.x, startPosition.y] as ArrayXY]

            tmpPoly = svg
                .polyline([...prev, [currentPosition.x, currentPosition.y]])
                .fill('none')
                .stroke({
                    color: '#f06',
                    width: 4,
                    linecap: 'round',
                    linejoin: 'round',
                })
        }
    }

    function onMouseUp(e: any) {
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

            if (e.target.parentNode === svg.node) {
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

            const rect = drawRect({
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

    function onClick(e: any) {
        if (!svg) return

        if (props.mode === 'path') {
            const svgRect = svg.node.getBoundingClientRect()

            console.log('click', tmpPoly)

            if (!tmpPoly) {
                startPosition = {
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                }
            } else if (startPosition && tmpPoly) {
                const currentPosition = {
                    x: e.clientX - svgRect.left,
                    y: e.clientY - svgRect.top,
                }

                const prev = poly
                    ? [...poly.plot()]
                    : [[startPosition.x, startPosition.y] as ArrayXY]

                
                if (tmpPoly) {
                    tmpPoly.remove()
                    tmpPoly = undefined
                }

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
                    startPosition = null
                    const svgRect = svg.node.getBoundingClientRect()

                    drawPoly({
                        points: prev.map(([x, y]) => ({
                            x: x / svgRect.width,
                            y: y / svgRect.height,
                        })),
                    })

                    onChange()
                } else {
                    poly = svg
                        .polyline([
                            ...prev,
                            [currentPosition.x, currentPosition.y],
                        ])
                        .fill('none')
                        .stroke({
                            color: '#f06',
                            width: 4,
                            linecap: 'round',
                            linejoin: 'round',
                        })

                    startPosition = currentPosition
                }
            }
        }

        // If click on main svg, and not an element, deselect everything.
        if (e.target === svg.node) {
            svg.each(function (this: Svg) {
                this.fire('deselect')
            })
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

        const newSvg = SVG().addTo(ref.current).size('100%', '100%')//.viewbox(0, 0, 100, 100)
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

        svg.on('mousedown', onMouseDown)

        svg.on('mouseup', onMouseUp)

        svg.on('click', onClick)
        window.addEventListener('mousemove', onMouseMove)

        return () => {
            svg.off('mousedown', onMouseDown)

            svg.off('mouseup', onMouseUp)

            svg.off('click', onClick)
            window.removeEventListener('mousemove', onMouseMove)
        }
    }, [svg, props.mode])

    return {
        svg,
        draw: ({ points }: { points: Array<Point> }) => {
            if (points.length === 2) drawRect({ points })
            else drawPoly({ points })
        },
    }
}

export interface DrawZoneProps {
    children: React.ReactNode
    src: string
    elements: Pick<ChangedElement, 'points'>[]
    onChange: (elements: ChangedElement[]) => void
    disabled?: boolean
    mode: DrawZoneMode
    scale: number
    drawOnMouseDown?: boolean
    showMarker?: boolean
}

export default function DrawZone({
    src,
    elements,
    onChange,
    children,
    disabled = false,
    mode = 'draw',
    scale,
    drawOnMouseDown,
    showMarker = false,
}: DrawZoneProps): JSX.Element {
    const svgRef = useRef<HTMLDivElement>(null)
    const { svg, draw } = useDraw(svgRef, src, {
        onChange,
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
                svg.children().filter((c) => !c.attr('data-marker')).length
            ) {
                svg.clear()
                elements.forEach((element) => draw(element))
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
    }, [svg, elements])

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
            {canMarkerBeVisible && showMarker && (
                <>
                    <div
                        style={{
                            position: 'absolute',
                            top: '0',
                            bottom: '0',
                            left:
                                clientX -
                                (svgRef.current?.getBoundingClientRect().left ||
                                    0),
                            width: '2px',
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
                                (svgRef.current?.getBoundingClientRect().top ||
                                    0),
                            height: '2px',
                            backgroundColor: 'black',
                            zIndex: 20,
                            pointerEvents: 'none',
                        }}
                    />
                </>
            )}
            <div ref={svgRef}>{children}</div>
        </div>
    )
}
