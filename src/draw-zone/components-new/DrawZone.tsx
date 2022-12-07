import React, { PropsWithChildren, useEffect } from 'react'
import { useControls, useLoadImage } from '../hooks'
import { PictureLoadingState } from '../types'
import DrawZoneInner from './DrawZoneInner'
import type { DrawZoneElement, DrawZoneMode, DrawZoneShape } from '../types'

export type DrawZoneProps = PropsWithChildren<{
    readonly disabled?: boolean
    readonly drawOnPointerDown?: boolean
    readonly elements: DrawZoneElement[]
    readonly initialRect?: Pick<DrawZoneElement, 'id' | 'label' | 'rect'>
    readonly mode: DrawZoneMode
    readonly shape: DrawZoneShape
    readonly src: string
    readonly onChange: (elements: DrawZoneElement[]) => void
    readonly onInitialRectChange?: (
        arg: Pick<DrawZoneElement, 'id' | 'label' | 'rect'>,
    ) => void
}>
export default function DrawZone({ children, src, ...props }: DrawZoneProps) {
    const { setImageSize, setViewBox } = useControls()
    const { status, pictureSize } = useLoadImage(src)

    useEffect(() => {
        if (status === PictureLoadingState.Done) {
            setImageSize(pictureSize)
            setViewBox(pictureSize)
        }
    }, [pictureSize, setImageSize, setViewBox, status])

    if (status === PictureLoadingState.Error)
        throw new Error('Failed to load image')

    if (status !== PictureLoadingState.Done) return null

    return (
        <DrawZoneInner src={src} {...props}>
            {children}
        </DrawZoneInner>
    )
}
