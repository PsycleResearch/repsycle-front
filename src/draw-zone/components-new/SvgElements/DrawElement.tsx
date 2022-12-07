import React from 'react'
import type { DrawZoneElement, DrawZoneMode, DrawZoneShape } from '../../types'
import DrawPolygonElement from './DrawPolygonElement'
import DrawRectElement from './DrawRectElement'

export type DrawElementProps = {
    readonly disabled?: boolean
    readonly element: DrawZoneElement
    readonly elements: DrawZoneElement[]
    readonly mode: DrawZoneMode
    readonly shape: DrawZoneShape
    readonly onChange: (elements: DrawZoneElement[]) => void
}
export default function DrawElement({
    disabled,
    element,
    elements,
    mode,
    shape,
    onChange,
}: DrawElementProps) {
    if (element.points?.length === 2) {
        return (
            <DrawRectElement
                disabled={disabled}
                element={element}
                elements={elements}
                mode={mode}
                onChange={onChange}
            />
        )
    }

    return (
        <DrawPolygonElement
            disabled={disabled}
            element={element}
            elements={elements}
            mode={mode}
            shape={shape}
            onChange={onChange}
        />
    )
}
