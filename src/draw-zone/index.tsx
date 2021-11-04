import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { SVG, Rect, Svg } from '@svgdotjs/svg.js'
import '@svgdotjs/svg.draggable.js'
import interact from 'interactjs'
import { uuid4 } from '../helpers'

interface Size {
    width: number
    height: number
}
interface Point {
    x: number
    y: number
}

type ExtendedCSSStyleName = CSSStyleName | 'touch-action'

export function useDraw(
    ref: React.RefObject<HTMLElement>,
    src: string,
    props: {
        onChange: Function
        disabled: boolean
        mode: DrawZoneProps['mode']
        scale: number
        drawOnMouseDown?: boolean
    },
) {
    const [svg, setSvg] = useState<Svg>()
    const [originalSize, setOriginalSize] = useState<Size>()
    let startPosition: Point | null
    let overlayRect: Rect | undefined
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
                svg.children().map((elt) => {
                    const box = elt.bbox()
                    return {
                        points: getAbsoluteCoordinates([
                            { x: box.x, y: box.y },
                            { x: box.x2, y: box.y2 },
                        ]),
                        selected: elt.data('selected'),
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
        rect.css<ExtendedCSSStyleName>('touch-action', 'none') // silence interactjs warning.

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
        if (!svg || !startPosition) {
            return
        }

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

        startPosition = null
    }

    function onClick(e: any) {
        if (!svg) return

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

        setSvg(SVG().addTo(ref.current).size('100%', '100%'))
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
        draw: (props: any) => drawRect(props),
    }
}

export interface DrawZoneProps {
    children: React.ReactNode
    src: string
    elements: object[]
    onChange: () => void
    disabled: boolean
    mode: 'draw' | 'move'
    scale: number
    drawOnMouseDown?: boolean
}

export default function DrawZone({
    src,
    elements,
    onChange,
    children,
    disabled,
    mode = 'draw',
    scale,
    drawOnMouseDown,
}: DrawZoneProps): JSX.Element {
    const svgRef = useRef<HTMLDivElement>(null)
    const { svg, draw } = useDraw(svgRef, src, {
        onChange,
        disabled,
        mode,
        scale,
        drawOnMouseDown,
    })

    useLayoutEffect(() => {
        if (svg) {
            if (elements.length !== svg.children().length) {
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
            }}
        >
            <div ref={svgRef}>{children}</div>
        </div>
    )
}
