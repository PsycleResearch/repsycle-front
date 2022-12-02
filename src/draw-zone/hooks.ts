import { useCallback, useContext, useEffect, useState } from 'react'
import { DrawZoneContext } from './state'
import { PictureLoadingState, Size } from './types'
import { MAX_SCALE, SCALE_STEP } from './constants'
import { memoize } from 'lodash'

async function preloadImage(src: string): Promise<Size> {
    return await new Promise<Size>((resolve, reject) => {
        // Use an iframe as a workarounf for multipart/x-mixed-replace images size compute
        // An ordinary image would load the multipart/x-mixed-replace twice and increase payload size
        const iframe = document.createElement('iframe')

        iframe.onload = () => {
            if (!iframe.contentWindow) {
                reject('No content window')
                iframe.remove()
            } else {
                const image = new Image()
                iframe.contentWindow.document.body.appendChild(image)

                image.onload = (ev) => {
                    const target = ev.target as HTMLImageElement
                    const { width, height } = target

                    image.remove()
                    iframe.remove()

                    resolve({ width, height })
                }
                image.onerror = () => {
                    reject('Failed to load image')
                    image.remove()
                    iframe.remove()
                }
                image.src = src
            }
        }

        const html = `<body></body>`

        if (typeof iframe.srcdoc !== 'undefined') {
            iframe.srcdoc = html
        } else if (iframe.contentWindow) {
            iframe.contentWindow.document.open()
            iframe.contentWindow.document.write(html)
            iframe.contentWindow.document.close()
        }

        document.body.appendChild(iframe)
    })
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
    const { state, setState } = useContext(DrawZoneContext)

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
