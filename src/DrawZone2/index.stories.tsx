import React, {
    FunctionComponent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'

import DrawZone2, { DrawZone2Editor, useControls, useDrawZone2 } from '.'
import type { DrawZoneElement } from '.'
import { isEmpty } from 'lodash'

export default {
    title: 'Components/DrawZone2',
    component: DrawZone2,
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
}
function Editor({ initialElements }: EditorProps) {
    const { pictureSize } = useDrawZone2()
    const [elements, setElements] = useState<Array<StoryZoneElement>>([])

    useEffect(() => {
        if (pictureSize) {
            setElements(initialElements)
        }
    }, [pictureSize, initialElements])

    const buildMetas = useCallback(
        (elem: DrawZoneElement) => {
            if (!pictureSize) return {}

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
        [pictureSize],
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
            <div>
                <pre>
                    <code>{JSON.stringify(elements)}</code>
                </pre>
            </div>
            <div>
                {element && !isEmpty(element.metadata) && (
                    <pre>
                        <code>{JSON.stringify(element.metadata)}</code>
                    </pre>
                )}
            </div>

            <div
                style={{
                    backgroundColor: '#aaa',
                    width: '500px',
                    height: '500px',
                }}
            >
                <DrawZone2Editor
                    elements={elements}
                    fitMode="fit"
                    mode="draw"
                    onChange={onChange}
                    shape="rect"
                />
            </div>
        </>
    )
}

export function Default() {
    return (
        <DrawZone2 src="https://picsum.photos/seed/drawzone/2000/1000">
            <Controls />
            <Editor
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
        </DrawZone2>
    )
}
