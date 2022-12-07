import React from 'react'
import { usePointerPosition } from '../../hooks'

export type MarkerProps = {
    readonly src: string | null
    readonly svgRef: React.RefObject<HTMLDivElement>
}
export default function Marker({ src, svgRef }: MarkerProps): JSX.Element {
    const { clientX, clientY } = usePointerPosition()

    const width = svgRef.current?.getBoundingClientRect().width
    const height = svgRef.current?.getBoundingClientRect().height
    const left = clientX - (svgRef.current?.getBoundingClientRect().left || 0)
    const top = clientY - (svgRef.current?.getBoundingClientRect().top || 0)

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    top: '0',
                    bottom: '0',
                    transform: `translate3d(${left}px, 0px, 0px)`,
                    width: '1px',
                    background: `url(${src}) ${
                        left * -1
                    }px 0% / ${width}px ${height}px, #fff`,
                    backgroundBlendMode: 'difference',
                    zIndex: 20,
                    pointerEvents: 'none',
                    touchAction: 'none',
                    willChange: 'transform, background',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    transform: `translate3d(0px, ${top}px, 0px)`,
                    right: '0',
                    left: '0',
                    height: '1px',
                    background: `url(${src}) 0% ${
                        top * -1
                    }px / ${width}px ${height}px, #fff`,
                    backgroundBlendMode: 'difference',
                    zIndex: 20,
                    pointerEvents: 'none',
                    touchAction: 'none',
                    willChange: 'transform, background',
                }}
            />
        </>
    )
}
