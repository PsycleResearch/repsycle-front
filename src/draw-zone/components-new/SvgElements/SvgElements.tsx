import React from 'react'
import DrawElement from './DrawElement'
import type { DrawZoneElement, DrawZoneMode, DrawZoneShape } from '../../types'

export type SvgElementsProps = {
    readonly disabled?: boolean
    readonly elements: DrawZoneElement[]
    readonly mode: DrawZoneMode
    readonly shape: DrawZoneShape
    readonly onChange: (elements: DrawZoneElement[]) => void
}
export default function SvgElements({
    disabled,
    elements,
    mode,
    shape,
    onChange,
}: SvgElementsProps) {
    return (
        <>
            {shape !== 'none' &&
                elements.map((element) => (
                    <DrawElement
                        key={element.id}
                        disabled={disabled}
                        elements={elements}
                        element={element}
                        mode={mode}
                        shape={shape}
                        onChange={onChange}
                    />
                ))}
        </>
    )
}
