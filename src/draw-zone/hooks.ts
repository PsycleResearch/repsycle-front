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
