import { useCallback, useContext, useEffect, useState } from 'react'
import { DrawZone2Context } from './state'
import { PictureLoadingState, Size } from './types'
import { MAX_SCALE, SCALE_STEP } from './constants'
import { memoize } from 'lodash'

async function preloadImage(src: string): Promise<Size> {
    const ev = await new Promise<Event>((resolve, reject) => {
        const image = new Image()
        image.onload = resolve
        image.onerror = reject
        image.src = src
    })

    const target = ev.target as HTMLImageElement
    const { width, height } = target
    return { width, height }
}

const preloadImageMemo = memoize(preloadImage)

export function useLoadImage(src: string) {
    const [status, setStatus] = useState<PictureLoadingState>(
        PictureLoadingState.Idle,
    )
    const [pictureSize, setPictureSize] = useState<Size>({
        width: 0,
        height: 0,
    })

    useEffect(() => {
        setStatus(PictureLoadingState.Loading)

        preloadImageMemo(src)
            .then(function afterLoad(value: Size) {
                setPictureSize(value)
                setStatus(PictureLoadingState.Done)
            })
            .catch(() => {
                preloadImageMemo.cache.delete(src)
                setStatus(PictureLoadingState.Error)
            })
    }, [src])

    return { status, pictureSize }
}

export function useControls() {
    const { state, setState } = useContext(DrawZone2Context)

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
        setState((prev) => ({ contentHidden: !prev.contentHidden }))
    }, [setState])

    const toggleMarker = useCallback(() => {
        setState((prev) => ({ markerVisible: !prev.markerVisible }))
    }, [setState])

    const toggleMove = useCallback(() => {
        setState((prev) => ({ move: !prev.move }))
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

    return {
        ...state,
        zoomIn,
        zoomOut,
        reset,
        toggleContent,
        toggleMarker,
        toggleMove,
        setPosition,
        setScale,
    }
}

/*
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

export function useDraw(
    ref: React.RefObject<HTMLElement>,
    onChange: (elements: DrawZoneElement[]) => void,
    mode: DrawZone2Mode,
    shape: DrawZone2Shape,
    drawOnMouseDown?: boolean,
    initialRect?: DrawZoneElement,
    onInitialRectChange?: (
        arg: Pick<DrawZoneElement, 'id' | 'label' | 'rect'>,
    ) => void,
) {
    const { disabled: isDisabled, pictureSize, src } = useDrawZone2()
    const { positionLeft, positionTop, scale, setPosition } =
        useDrawZone2PrivateState()
    const { move, markerVisible, redraw } = useControls()
    const [svg, setSvg] = useState<Svg>()

    let startPosition: Point | null
    let overlayRect: Rect | undefined
    let overlayRect2: Rect | undefined
    let poly: Polygon | undefined
    let tmpPoly: Polyline | undefined
    let tmpPoints: Array<Circle> | undefined
    let dragging: boolean

    const convertForOnChange = useCallback(
        function convertForOnChange(): DrawZoneElement[] {
            if (!svg) {
                return []
            }

            const svgRect = svg.node.getBoundingClientRect()

            return svg
                .children()
                .filter((e) => !e.attr('data-draw-ignore'))
                .map((elt) => {
                    const elementRect = elt.node.getBoundingClientRect()

                    const rect: DrawZoneElement['rect'] = {
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
                                    shape === 'poly' || index % 2 === 0,
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
        [shape, svg],
    )

    const innerOnChange = useCallback(
        function innerOnChange() {
            onChange(convertForOnChange())
        },
        [convertForOnChange, onChange],
    )

    /*
    function onDelKeyPress(this: SVGElement, event: KeyboardEvent): boolean {
        if (event.defaultPrevented) return false
        if (event.key === 'Delete' && this.closest('svg')) {
            event.preventDefault()
            remove(this.dataset['id'] as string)

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

        innerOnChange()
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
    *

    const preventDrag = useCallback((event: DragEvent) => {
        event.preventDefault()
    }, [])

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

        const svgWidth = svgRect.width || pictureSize?.width || 0
        const svgHeight = svgRect.height || pictureSize?.height || 0

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

        /*
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
        *

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

                        if (shape === 'rect') {
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

                        if (shape === 'poly') {
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

                        innerOnChange()
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
            /*
            window.addEventListener('keyup', polyDelKeyPress, {
                capture: true,
            })
            window.addEventListener('keyup', polyEscKeyPress, {
                capture: true,
            })
            *

            if (!disabled) {
                cleanHandles()
                createHandles(svg)
            }

            innerOnChange()
        })
        poly.on('deselect', (e) => {
            if ((e as CustomEvent).detail?.inst === poly) return
            poly.stroke(stroke)
            poly.data('selected', false)

            cleanHandles()

            /*
            window.removeEventListener('keyup', polyDelKeyPress, {
                capture: true,
            })
            window.removeEventListener('keyup', polyEscKeyPress, {
                capture: true,
            })
            *

            innerOnChange()
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

                        innerOnChange()
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

            //endPolyDrawing(event)
        })

        return point
    }

    function draw({ id, points, color, label }: DrawZoneElement) {
        const hexColor = color ? bgrToHex(...color) : null

        const fill = hexColor
            ? { ...defaultFill, color: hexColor }
            : defaultFill
        const stroke = hexColor
            ? { ...defaultStroke, color: hexColor }
            : defaultStroke

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
            innerOnChange()
        }

        if (move) {
            startPosition = {
                x: e.clientX,
                y: e.clientY,
            }

            dragging = true

            svg.css({
                cursor: 'grabbing',
            })

            e.preventDefault()
        } else if (mode === 'draw' && !isDisabled) {
            const svgRect = svg.node.getBoundingClientRect()

            if (shape === 'poly' && !isDisabled) {
                if (!tmpPoints) {
                    startPosition = {
                        x: e.clientX - svgRect.left,
                        y: e.clientY - svgRect.top,
                    }

                    tmpPoints = [
                        drawPoint(svg, startPosition.x, startPosition.y),
                    ]

                    /*
                    window.addEventListener('keyup', onAbortPathDrawing, {
                        capture: true,
                    })
                    window.addEventListener('keyup', onEnterKeyPress, {
                        capture: true,
                    })
                    *
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

                        /*
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
                        *

                        poly?.fire('select')

                        innerOnChange()
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
        }
    }

    function onPointerMove(this: Window, e: globalThis.PointerEvent) {
        if (e.defaultPrevented) return
        if (!svg || !startPosition) return

        if (move && dragging) {
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
        } else if (mode === 'draw' && !isDisabled) {
            if (shape === 'poly' && !isTouchDevice) {
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
        }
    }

    function onPointerUp(this: Window, e: globalThis.PointerEvent) {
        if (e.defaultPrevented) return
        if (!svg) return

        if (move && dragging) {
            const parent = svg.parent()

            if (parent) {
                const grandParent = parent.parent()

                if (grandParent) {
                    const parentRect = grandParent.node.getBoundingClientRect()
                    const svgRect = parent.node.getBoundingClientRect()

                    setPosition(
                        svgRect.top - parentRect.top,
                        svgRect.left - parentRect.left,
                    )

                    svg.css({ cursor: 'grab' })

                    dragging = false
                }
            }
        } else if (mode === 'draw' && shape === 'rect' && !isDisabled) {
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

                if (initialRect) {
                    lastRect = initialRect
                }

                label = lastRect?.label

                if (drawOnMouseDown && lastRect && lastRect.rect) {
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

            if (newRect && onInitialRectChange) {
                const elementRect = newRect.node.getBoundingClientRect()
                const rect: DrawZoneElement['rect'] = {
                    height: (elementRect.height / svgRect.height) * 100,
                    width: (elementRect.width / svgRect.width) * 100,
                    x: ((elementRect.x - svgRect.x) / svgRect.width) * 100,
                    y: ((elementRect.y - svgRect.y) / svgRect.height) * 100,
                }
                onInitialRectChange({
                    rect: rect,
                    label: newRect.data('label'),
                    id: newRect.data('id'),
                })
            }

            setTimeout(() => {
                newRect?.fire('select')
                innerOnChange()
            }, 50)
        }

        if (!move && (mode !== 'draw' || (mode === 'draw' && shape !== 'poly')))
            startPosition = null
    }

    useEffect(() => {
        if (!ref.current) {
            return
        }

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
        if (ref.current && pictureSize && scale) {
            ref.current.style.width = `${pictureSize.width * scale}px`

            ref.current.style.height = `${pictureSize.height * scale}px`

            if (svg) {
                redraw()
            }
        }
    }, [ref, pictureSize, scale])

    useLayoutEffect(() => {
        if (!svg) {
            return
        }

        svg.css({
            cursor:
                move && !isDisabled
                    ? 'grab'
                    : mode === 'none' && !markerVisible
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
    }, [svg, mode, initialRect])

    return { svg, draw }
}
*/
