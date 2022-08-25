import React, {
    FunctionComponent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'

import DrawZone, { DrawZoneContainer, useControls, useLoadImage } from '.'
import type { DrawZoneElement } from '.'
import { DrawZoneShape, PictureLoadingState } from './types'

export default {
    title: 'Components/DrawZone',
    component: DrawZone,
    decorators: [
        (Story: FunctionComponent) => (
            <div style={{ height: '100vh' }}>
                <Story />
            </div>
        ),
    ],
    parameters: {
        layout: 'fullscreen',
    },
}

function Controls() {
    const {
        contentHidden,
        markerVisible,
        move,
        reset,
        toggleContent,
        toggleMarker,
        toggleMove,
        zoomIn,
        zoomOut,
    } = useControls()
    return (
        <div>
            <button onClick={reset}>Reset</button>
            <button onClick={toggleMove}>{move ? 'Move' : 'Draw'}</button>
            <button onClick={zoomIn}>Zoom in</button>
            <button onClick={zoomOut}>Zoom out</button>
            <button onClick={toggleMarker}>
                {markerVisible ? 'Hide' : 'Show'} marker
            </button>
            <button onClick={toggleContent}>
                {contentHidden ? 'Show' : 'Hide'} content
            </button>
        </div>
    )
}

interface StoryZoneElement extends DrawZoneElement {
    readonly metadata: Record<string, string>
}

type EditorProps = {
    readonly initialElements: StoryZoneElement[]
    readonly shape: DrawZoneShape
    readonly src: string
}
function Editor({ initialElements, shape, src }: EditorProps) {
    const { status, pictureSize } = useLoadImage(src)
    const [elements, setElements] = useState<Array<StoryZoneElement>>([])

    useEffect(() => {
        setElements(initialElements)
    }, [initialElements])

    const buildMetas = useCallback(
        (elem: DrawZoneElement) => {
            if (!pictureSize || shape !== 'rect') return {}

            return {
                width: Math.floor(
                    (elem.rect.width * pictureSize.width) / 100,
                ).toString(),
                height: Math.floor(
                    (elem.rect.height * pictureSize.height) / 100,
                ).toString(),
                diagonal: Math.floor(
                    Math.hypot(
                        (elem.rect.height * pictureSize.height) / 100,
                        (elem.rect.width * pictureSize.width) / 100,
                    ),
                ).toString(),
                area: Math.floor(
                    ((elem.rect.width * pictureSize.width) / 100) *
                        ((elem.rect.height * pictureSize.height) / 100),
                ).toString(),
            } as Record<string, string>
        },
        [pictureSize, shape],
    )

    const onChange = useCallback(
        (elements: DrawZoneElement[]) => {
            const newElements = elements.map((elem) => {
                return {
                    ...elem,
                    metadata: buildMetas(elem),
                }
            })

            setElements([...newElements])
        },
        [buildMetas, setElements],
    )

    const element = useMemo(
        () => elements.find(({ selected }) => selected),
        [elements],
    )

    return (
        <>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: '40px',
                }}
            >
                <span>Current item :</span>
                {element && (
                    <>
                        <button
                            onClick={() => {
                                onChange(
                                    elements.filter(
                                        ({ id }) => id !== element.id,
                                    ),
                                )
                            }}
                        >
                            Delete
                        </button>
                        <pre>
                            <code>{JSON.stringify(element.metadata)}</code>
                        </pre>
                    </>
                )}
            </div>

            <div
                style={{
                    backgroundColor: '#aaa',
                    width: '500px',
                    height: '500px',
                }}
            >
                {status === PictureLoadingState.Done && (
                    <DrawZone
                        src={src}
                        elements={elements}
                        fitMode="fit"
                        mode="draw"
                        onChange={onChange}
                        shape={shape}
                    />
                )}
            </div>
        </>
    )
}

export function Default() {
    return (
        <DrawZoneContainer>
            <Controls />
            <Editor
                src="https://picsum.photos/seed/drawzone/2000/1000"
                shape="rect"
                initialElements={[
                    {
                        id: 'rect1',
                        points: [
                            { x: 125, y: 94 },
                            { x: 250, y: 1 },
                        ],
                        color: [0, 0, 255],
                        selected: false,
                    } as unknown as StoryZoneElement,
                ]}
            />
        </DrawZoneContainer>
    )
}

export function Poly() {
    return (
        <DrawZoneContainer>
            <Controls />
            <Editor
                src="https://picsum.photos/seed/drawzone/2000/1000"
                shape="poly"
                initialElements={[
                    {
                        id: 'poly2',
                        points: [
                            { x: 37, y: 26 },
                            { x: 125, y: 188 },
                            { x: 250, y: 188 },
                            { x: 250, y: 94 },
                        ],
                        color: '#00ff00',
                    } as unknown as StoryZoneElement,
                ]}
            />
        </DrawZoneContainer>
    )
}
