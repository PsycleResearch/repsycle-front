import React, { useCallback, useEffect, useRef, useState } from 'react'
import SvgZone from './SvgZone'
import Marker from './Marker'
import { useControls } from '../hooks'
import { filterPoints } from '../utils'
import type { DrawZoneElement } from '../types'
import type { DrawZoneProps } from './DrawZone'

type DrawZoneInnerProps = DrawZoneProps
export default function DrawZoneInner({
    children,
    disabled,
    drawOnPointerDown,
    elements,
    initialRect,
    mode,
    shape,
    src,
    onChange,
    onInitialRectChange,
}: DrawZoneInnerProps) {
    const { contentHidden, markerVisible, imageSize } = useControls()
    const containerRef = useRef<HTMLDivElement>(null)
    const [canMarkerBeVisible, setCanMarkerBeVisible] = useState(false)

    useEffect(() => {
        const { current } = containerRef

        if (current) {
            const handlePointerEnter = () => {
                setCanMarkerBeVisible(true)
            }
            const handlePointerLeave = () => {
                setCanMarkerBeVisible(false)
            }

            current.addEventListener('pointerenter', handlePointerEnter)
            current.addEventListener('pointerleave', handlePointerLeave)

            return () => {
                current.removeEventListener('pointerenter', handlePointerEnter)
                current.removeEventListener('pointerleave', handlePointerLeave)
            }
        }
    }, [])

    const localOnChange = useCallback(
        (elements: DrawZoneElement[]) => {
            if (contentHidden) return

            onChange(
                elements.map((element) => {
                    const points = element.points.map(({ x, y }) => ({
                        x: Math.round(x),
                        y: Math.round(y),
                    }))
                    const minX = Math.min(...points.map(({ x }) => x))
                    const minY = Math.min(...points.map(({ y }) => y))
                    const maxX = Math.max(...points.map(({ x }) => x))
                    const maxY = Math.max(...points.map(({ y }) => y))

                    const rect: DrawZoneElement['rect'] = {
                        height: maxY - minY,
                        width: maxX - minX,
                        x: minX,
                        y: minY,
                    }

                    return {
                        ...element,
                        rect,
                        points: points.filter(filterPoints(shape)),
                    }
                }),
            )
        },
        [contentHidden, onChange, shape],
    )

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
                pointerEvents: 'auto',
                touchAction: 'none',
                userSelect: 'none',
            }}
            ref={containerRef}
        >
            {canMarkerBeVisible && markerVisible && (
                <Marker src={src} svgRef={containerRef} />
            )}
            {imageSize && (
                <SvgZone
                    src={src}
                    disabled={disabled}
                    drawOnPointerDown={drawOnPointerDown}
                    elements={contentHidden ? [] : elements}
                    initialRect={initialRect}
                    mode={mode}
                    shape={shape}
                    onChange={localOnChange}
                    onInitialRectChange={onInitialRectChange}
                />
            )}
            {children}
        </div>
    )
}
