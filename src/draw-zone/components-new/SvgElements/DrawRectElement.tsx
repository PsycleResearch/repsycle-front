import React, { useMemo } from 'react'
import DrawPolygonElement from './DrawPolygonElement'
import type { DrawZoneElement, DrawZoneMode, Point } from '../../types'

export type DrawRectElementProps = {
    readonly disabled?: boolean
    readonly element: DrawZoneElement
    readonly elements: DrawZoneElement[]
    readonly mode: DrawZoneMode
    readonly onChange: (elements: DrawZoneElement[]) => void
}
export default function DrawRectElement({
    disabled,
    element,
    elements,
    mode,
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
            disabled={disabled}
            element={newElement}
            elements={elements}
            mode={mode}
            shape="rect"
            onChange={onChange}
        />
    )
}
