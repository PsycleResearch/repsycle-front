import React, { useEffect, useState } from 'react'

import DrawZone, { ChangedElement, DrawZoneMode } from '.'

export default {
    title: 'Components/DrawZone',
    component: DrawZone,
}

export function Rects({}) {
    const [scale, setScale] = useState(1)
    const mode = 'draw'
    const [move, setMove] = useState(false)
    const [forceDraw, setForceDraw] = useState(false)
    const [elements, setElements] = useState<Array<Partial<ChangedElement>>>([
        {
            id: 'rect1',
            points: [
                { x: 0.5, y: 0.5 },
                { x: 1, y: 1 },
            ],
        },
    ])
    const [showMarker, setShowMarker] = useState(false)

    return (
        <div>
            <div>
                <button onClick={() => setScale((old) => old - 0.25)}>
                    Reduire
                </button>
                <button onClick={() => setScale((old) => old + 0.25)}>
                    Agrandir
                </button>
                <button onClick={() => setMove((m) => !m)}>
                    {move ? 'Déplacer actif' : 'Déplacer inactif'}
                </button>
                <button onClick={() => setShowMarker((s) => !s)}>
                    {showMarker ? 'Cacher' : 'Afficher'} marqueur
                </button>
                <button
                    onClick={() => {
                        setForceDraw(true)
                        setTimeout(() => setForceDraw(false), 250)
                    }}
                >
                    Force draw
                </button>
            </div>
            <DrawZone
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/250px-Image_created_with_a_mobile_phone.png"
                elements={elements}
                onChange={(elements: ChangedElement[]) => setElements(elements)}
                remove={(id) =>
                    setElements((el) => el.filter((e) => e.id !== id))
                }
                scale={scale}
                mode={move ? 'move' : mode}
                showMarker={showMarker}
                forceDraw={forceDraw}
            >
                {elements.map((element, index) => {
                    const elem = element as ChangedElement

                    if (!elem.selected) return null

                    return (
                        <div
                            key={index}
                            style={{
                                position: 'absolute',
                                zIndex: 10,
                                top: elem.rect
                                    ? `${elem.rect.y}%`
                                    : `${elem.points[0].y * 100}%`,
                                left: elem.rect
                                    ? `${elem.rect.x}%`
                                    : `${elem.points[0].x * 100}%`,
                                border:
                                    elem.rect && elem.selected
                                        ? '1px dashed black'
                                        : 'none',
                                width:
                                    elem.rect && elem.selected
                                        ? `${elem.rect.width}%`
                                        : 'auto',
                                height:
                                    elem.rect && elem.selected
                                        ? `${elem.rect.height}%`
                                        : 'auto',
                                pointerEvents: 'none',
                            }}
                        >
                            <button
                                style={{
                                    pointerEvents: 'auto',
                                }}
                                onClick={() => {
                                    console.log(
                                        'elements',
                                        elements.filter(
                                            (_, idx) => index !== idx,
                                        ),
                                    )
                                    setElements(
                                        elements.filter(
                                            (_, idx) => index !== idx,
                                        ),
                                    )
                                }}
                            >
                                supprimer
                            </button>
                        </div>
                    )
                })}
            </DrawZone>
        </div>
    )
}

export function Polygons({}) {
    const [scale, setScale] = useState(1)
    const mode = 'path'
    const [move, setMove] = useState(false)
    const [forceDraw, setForceDraw] = useState(false)
    const [elements, setElements] = useState<Array<Partial<ChangedElement>>>([
        /*
        {
            id: 'poly2',
            points: [
                { x: 0, y: 0 },
                { x: 0.5, y: 0.5 },
                { x: 0.25, y: 1 },
            ],
        },
        {
            id: 'poly3',
            points: [
                { x: 0.1, y: 0.1 },
                { x: 0.4, y: 0.4 },
                { x: 0.25, y: 0.8 },
            ],
        },
        */
        {
            id: 'poly1',
            points: [
                { x: 0.2, y: 0.3 },
                { x: 0.2, y: 0.85 },
                { x: 0.6, y: 0.8 },
                { x: 0.8, y: 0.2 },
            ],
        },
    ])
    const [showMarker, setShowMarker] = useState(false)

    return (
        <div>
            <div>
                <button onClick={() => setScale((old) => old - 0.25)}>
                    Reduire
                </button>
                <button onClick={() => setScale((old) => old + 0.25)}>
                    Agrandir
                </button>
                <button onClick={() => setMove((m) => !m)}>
                    {move ? 'Déplacer actif' : 'Déplacer inactif'}
                </button>
                <button onClick={() => setShowMarker((s) => !s)}>
                    {showMarker ? 'Cacher' : 'Afficher'} marqueur
                </button>
                <button
                    onClick={() => {
                        setForceDraw(true)
                        setTimeout(() => setForceDraw(false), 250)
                    }}
                >
                    Force draw
                </button>
            </div>
            <DrawZone
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/250px-Image_created_with_a_mobile_phone.png"
                elements={elements}
                onChange={(elements: ChangedElement[]) => setElements(elements)}
                remove={(id) =>
                    setElements((el) => el.filter((e) => e.id !== id))
                }
                scale={scale}
                mode={move ? 'move' : mode}
                showMarker={showMarker}
                forceDraw={forceDraw}
            >
                {elements.map((element, index) => {
                    const elem = element as ChangedElement

                    if (!elem.selected) return null

                    return (
                        <div
                            key={index}
                            style={{
                                position: 'absolute',
                                zIndex: 10,
                                top: elem.rect
                                    ? `${elem.rect.y}%`
                                    : `${elem.points[0].y * 100}%`,
                                left: elem.rect
                                    ? `${elem.rect.x}%`
                                    : `${elem.points[0].x * 100}%`,
                                border:
                                    elem.rect && elem.selected
                                        ? '1px dashed black'
                                        : 'none',
                                width:
                                    elem.rect && elem.selected
                                        ? `${elem.rect.width}%`
                                        : 'auto',
                                height:
                                    elem.rect && elem.selected
                                        ? `${elem.rect.height}%`
                                        : 'auto',
                                pointerEvents: 'none',
                            }}
                        >
                            <button
                                style={{
                                    pointerEvents: 'auto',
                                }}
                                onClick={() => {
                                    console.log(
                                        'elements',
                                        elements.filter(
                                            (_, idx) => index !== idx,
                                        ),
                                    )
                                    setElements(
                                        elements.filter(
                                            (_, idx) => index !== idx,
                                        ),
                                    )
                                }}
                            >
                                supprimer
                            </button>
                        </div>
                    )
                })}
            </DrawZone>
        </div>
    )
}
