import type { ViewBoxLike } from '@svgdotjs/svg.js'
import type { DrawZoneElement, DrawZoneShape, Point } from './types'

export function filterPoints(shape: DrawZoneShape) {
    return function filter(_: Point, index: number, arr: Point[]): boolean {
        if (arr.length === 2) return true

        return shape === 'poly' || index % 2 === 0
    }
}

export function preventDrag(event: DragEvent) {
    event.preventDefault()
}

export function unSelectElement(element: DrawZoneElement): DrawZoneElement {
    if (element.selected)
        return {
            ...element,
            selected: false,
        }

    return element
}

type ZoomKind = 'zoomIn' | 'zoomOut' | number
export function zoom(
    zoom: ZoomKind,
    startPoint: Point,
    viewBox: ViewBoxLike,
): ViewBoxLike {
    const scaleDelta = !isNaN(Number(zoom))
        ? Number(zoom)
        : zoom === 'zoomIn'
        ? 1 / 1.2
        : 1.2

    return {
        x: viewBox.x - (startPoint.x - viewBox.x) * (scaleDelta - 1),
        y: viewBox.y - (startPoint.y - viewBox.y) * (scaleDelta - 1),
        width: viewBox.width * scaleDelta,
        height: viewBox.height * scaleDelta,
    }
}

export function getSVGPoint(
    originX: number,
    originY: number,
    matrix?: DOMMatrix,
) {
    const point = new DOMPoint()
    point.x = originX
    point.y = originY

    return point.matrixTransform(matrix)
}
