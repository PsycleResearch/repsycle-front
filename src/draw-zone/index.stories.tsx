import React, { useEffect, useState } from 'react'

import DrawZone, { ChangedElement, DrawZoneMode } from '.'

export default {
    title: 'Components/DrawZone',
    component: DrawZone,
}

export function Base({}) {
    const [scale, setScale] = useState(1)
    const [mode, setMode] = useState<DrawZoneMode>('draw')
    const [move, setMove] = useState(false)
    const [forceDraw, setForceDraw] = useState(false)
    const [elements, setElements] = useState<
        Array<Pick<ChangedElement, 'points'>>
    >([
        /*
        {
            points: [
                { x: 0.5, y: 0.5 },
                { x: 1, y: 1 },
            ],
        },
        {
            points: [
                { x: 0, y: 0 },
                { x: 0.5, y: 0.5 },
                { x: 0.25, y: 1 },
            ],
        },
        {
            points: [
                { x: 0.1, y: 0.1 },
                { x: 0.4, y: 0.4 },
                { x: 0.25, y: 0.8 },
            ],
        },
        */
       {
            points: [
                { x: 0.2, y: 0.2 },
                { x: 0.2, y: 0.8 },
                { x: 0.8, y: 0.8 },
                { x: 0.8, y: 0.2 },
            ]
       }
    ])
    const [showMarker, setShowMarker] = useState(false)

    useEffect(() => {
        console.log('elements', elements)
    }, [elements])

    return (
        <div>
            <div>
                <button onClick={() => setScale((old) => old - 0.25)}>
                    Reduire
                </button>
                <button onClick={() => setScale((old) => old + 0.25)}>
                    Agrandir
                </button>
                <button
                    onClick={() =>
                        setMode((old) => (old === 'draw' ? 'path' : 'draw'))
                    }
                >
                    {mode === 'draw' ? 'Tracer' : 'Dessiner'}
                </button>
                <button onClick={() => setMove((m) => !m)}>
                    {move ? 'Déplacer actif' : 'Déplacer inactif'}
                </button>
                <button onClick={() => setShowMarker((s) => !s)}>
                    {showMarker ? 'Cacher' : 'Afficher'} marqueur
                </button>
                <button onClick={() => {
                    setForceDraw(true)
                    setTimeout(() => setForceDraw(false), 250)
                }}>Force draw</button>
            </div>
            <DrawZone
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/250px-Image_created_with_a_mobile_phone.png"
                elements={elements}
                onChange={(elements: ChangedElement[]) => setElements(elements)}
                scale={scale}
                mode={move ? 'move' : mode}
                showMarker={showMarker}
                forceDraw={forceDraw}
            >
                {elements.map((element, index) => (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            zIndex: 10,
                            top: `${element.points[0].y * 100}%`,
                            left: `${element.points[0].x * 100}%`,
                        }}
                    >
                        <button
                            onClick={() => {
                                console.log(
                                    'elements',
                                    elements.filter((_, idx) => index !== idx),
                                )
                                setElements(
                                    elements.filter((_, idx) => index !== idx),
                                )
                            }}
                        >
                            supprimer
                        </button>
                    </div>
                ))}
            </DrawZone>
        </div>
    )
}
