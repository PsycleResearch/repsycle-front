import React, { useMemo } from 'react'
import { blue } from '../../constants'
import { bgrToHex } from '../../../helpers'
import type { DrawZoneElement, DrawZoneMode, DrawZoneShape } from '../../types'

export type DrawPolygonElementProps = {
    readonly disabled?: boolean
    readonly element: DrawZoneElement
    readonly elements: DrawZoneElement[]
    readonly mode: DrawZoneMode
    readonly shape: DrawZoneShape
    readonly onChange: (elements: DrawZoneElement[]) => void
}
export default function DrawPolygonElement({
    disabled,
    element,
    elements,
    mode,
    shape,
    onChange,
}: DrawPolygonElementProps) {
    const path = element.points
        .map((point) => [point.x, point.y].join(','))
        .join(' ')

    const stroke = useMemo(
        () =>
            element.selected
                ? blue
                : element.color
                ? bgrToHex(...element.color)
                : '#ffffff',
        [element.selected, element.color],
    )

    return (
        <polygon
            points={path}
            stroke={stroke}
            strokeOpacity={1}
            strokeWidth={2}
            fillOpacity={0}
            style={{
                touchAction: 'none', // silence interactjs warning.
            }}
        />
    )
}
