import { useCallback, useContext, useEffect, useState } from 'react'
import { DrawZoneContext } from './state'
import { PictureLoadingState, Size } from './types'
import { memoize } from 'lodash'
import { MAX_SCALE, SCALE_STEP } from './constants'

async function preloadImage(src: string): Promise<Size> {
    return await new Promise<Size>((resolve, reject) => {
        // Use an iframe as a workaround for multipart/x-mixed-replace images size compute
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
/*
export function useControls() {
    const context = useContext(DrawZoneContext)

    if (!context)
        throw new Error('This hook must be user withing the drawzone context')

    const { state, setState } = context

    const zoomIn = useCallback(() => {
        setState((prev) => ({
            viewBox: {
                x: prev.viewBox.x - (prev.imageSize.width / 2 - prev.viewBox.x) * (1 / 1.2 - 1),
                y: prev.viewBox.y - (prev.imageSize.height / 2 - prev.viewBox.y) * (1 / 1.2 - 1),
                height: prev.viewBox.height * 1 / 1.2,
                width: prev.viewBox.width * 1 / 1.2,
            },
        }))
    }, [setState])

    const zoomOut = useCallback(() => {
        setState((prev) => ({
            viewBox: {
                x: prev.viewBox.x - (prev.imageSize.width / 2 - prev.viewBox.x) * 0.2,
                y: prev.viewBox.y - (prev.imageSize.height / 2 - prev.viewBox.y) * 0.2,
                height: prev.viewBox.height * 1.2,
                width: prev.viewBox.width * 1.2,
            },
        }))
    }, [setState])

    const reset = useCallback(() => {
        setState((prev) => ({
            viewBox: {
                x: 0,
                y: 0,
                height: prev.imageSize.height,
                width: prev.imageSize.width,
            },
        }))
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

    const setImageSize = useCallback(
        (size: Size) => {
            setState({ imageSize: size })
        },
        [setState],
    )

    const setViewBox = useCallback(
        (viewBox: SetStateAction<ViewBoxLike | Partial<ViewBoxLike>>) => {
            setState((prev) => {
                const newValue =
                    typeof viewBox === 'function'
                        ? (
                              viewBox as (
                                  prevState: ViewBoxLike | Partial<ViewBoxLike>,
                              ) => ViewBoxLike | Partial<ViewBoxLike>
                          )(prev.viewBox)
                        : viewBox

                const finalValue = { ...prev.viewBox, ...newValue }

                if (isEqual(prev.viewBox, finalValue)) return prev

                return { viewBox: finalValue }
            })
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
        setImageSize,
        setViewBox,
    }
}
*/
