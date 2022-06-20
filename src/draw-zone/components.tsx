import React, {
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useReducer,
    useRef,
    useState,
} from 'react'
import { usePointerPosition } from '../hooks'
import { useDraw } from './hooks'
import { DrawZoneContext, drawZoneInitialState, drawZoneReducer } from './state'
import {
    ChangedElement,
    DrawZoneMode,
    DrawZoneShape,
    DrawZoneState,
    DrawZoneStateActionType,
    SizeMode,
} from './types'

export interface DrawZoneProps {
    readonly children?: React.ReactNode
    readonly mode?: DrawZoneMode
    readonly shape: DrawZoneShape
    readonly sizeMode?: SizeMode
    readonly src: string
    readonly elements: Partial<ChangedElement>[]
    readonly initialRect?: ChangedElement
    readonly onChange: (elements: ChangedElement[]) => void
    readonly remove: (id: string) => void
    readonly onInitialRectChange?: (
        arg: Pick<ChangedElement, 'id' | 'label' | 'rect'>,
    ) => void
    readonly drawOnMouseDown?: boolean
}

export default function DrawZone({
    children,
    mode = 'draw',
    shape,
    sizeMode = 'auto',
    src,
    elements,
    onChange,
    remove,
    initialRect,
    onInitialRectChange,
    drawOnMouseDown,
}: DrawZoneProps) {
    const {
        state: {
            scale,
            isMarkerShown,
            positionTop,
            positionLeft,
            redraw,
            logicalScale,
        },
        dispatch,
    } = useContext(DrawZoneContext)
    const svgRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const { svg, draw, originalSize } = useDraw(svgRef, src, {
        onChange,
        remove,
        mode,
        shape,
        drawOnMouseDown,
        initialRect,
        onInitialRectChange,
    })
    const [canMarkerBeVisible, setCanMarkerBeVisible] = useState(false)
    const [forceRedraw, setForceRedraw] = useState(false)

    const setScale = useCallback(
        (scale: number) => {
            dispatch({
                type: DrawZoneStateActionType.SET_SCALE,
                payload: scale,
            })
        },
        [dispatch],
    )

    useEffect(() => {
        dispatch({
            type: DrawZoneStateActionType.SET_ORIGINAL_SIZE,
            payload: originalSize,
        })
        dispatch({
            type: DrawZoneStateActionType.FORCE_REDRAW,
        })
    }, [originalSize])

    useEffect(() => {
        if (sizeMode === 'auto') {
            setScale(logicalScale)
        } else if (containerRef.current && originalSize) {
            const rect = containerRef.current.getBoundingClientRect()

            const minWidth = Math.min(rect.width, originalSize.width)
            const minHeight = Math.min(rect.height, originalSize.height)

            if (
                originalSize.width <= minWidth &&
                originalSize.height <= minHeight
            ) {
                const maxWidth = Math.max(rect.width, originalSize.width)
                const maxHeight = Math.max(rect.height, originalSize.height)

                const coef = maxWidth / minWidth
                const coef2 = maxHeight / minHeight

                if (originalSize.height * coef <= maxHeight) {
                    setScale(coef * logicalScale)
                } else if (originalSize.width * coef2 <= maxWidth) {
                    setScale(coef2 * logicalScale)
                } else {
                    setScale(logicalScale)
                }
            } else if (
                minWidth < originalSize.width ||
                minHeight < originalSize.height
            ) {
                setScale(
                    Math.min(
                        minWidth / originalSize.width,
                        minHeight / originalSize.height,
                    ) * logicalScale,
                )
            }
        }
    }, [containerRef, originalSize, sizeMode, logicalScale])

    useEffect(() => {
        const { current } = svgRef
        const { current: container } = containerRef

        if (current && container) {
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

    useEffect(() => {
        if (svgRef.current) {
            svgRef.current.style.top = `${positionTop}px`
            svgRef.current.style.left = `${positionLeft}px`
            svgRef.current.style.transform = 'none'
        }
    }, [positionTop, positionLeft])

    useEffect(() => {
        setForceRedraw(true)
    }, [mode, redraw])

    useLayoutEffect(() => {
        if (svg) {
            if (
                elements.length !==
                    svg.children().filter((c) => !c.attr('data-draw-ignore'))
                        .length ||
                forceRedraw
            ) {
                svg.clear()
                elements.forEach((element) => draw(element as ChangedElement))

                if (forceRedraw) setForceRedraw(false)
                return
            }
        }
    }, [svg, elements, forceRedraw, scale])

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
            <div ref={svgRef}>
                {canMarkerBeVisible && isMarkerShown && (
                    <Marker src={src} svgRef={svgRef} />
                )}
                {children}
            </div>
        </div>
    )
}

type MarkerProps = {
    readonly src: string
    readonly svgRef: React.RefObject<HTMLDivElement>
}
function Marker({ src, svgRef }: MarkerProps): JSX.Element {
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

export type DrawZoneContainerProps = Partial<DrawZoneState> & {
    readonly children: ReactNode
}
export function DrawZoneContainer({
    children,
    ...props
}: DrawZoneContainerProps) {
    const [state, dispatch] = useReducer(drawZoneReducer, {
        ...drawZoneInitialState,
        ...props,
    })

    return (
        <DrawZoneContext.Provider value={{ state, dispatch }}>
            {children}
        </DrawZoneContext.Provider>
    )
}
