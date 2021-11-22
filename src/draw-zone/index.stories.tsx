import React, { useEffect, useState } from 'react'

import DrawZone, { ChangedElement, Size } from '.'

export default {
    title: 'Components/DrawZone',
    component: DrawZone,
}

export function Rects({}) {
    const originalElements = [
        {
            id: 'rect1',
            points: [
                { x: 125, y: 94 },
                { x: 250, y: 1 },
            ],
            fillColor: '#00ff00',
            strokeColor: '#00ff00',
        },
    ]
    const [scale, setScale] = useState(1)
    const mode = 'draw'
    const [move, setMove] = useState(false)
    const [elements, setElements] = useState<Array<Partial<ChangedElement>>>([])
    const [showMarker, setShowMarker] = useState(false)
    const [orignalSize, setOriginalSize] = useState<Size>()

    useEffect(() => {
        if (orignalSize) {
            setElements(
                originalElements.map(
                    (element) =>
                        ({
                            ...element,
                            points: element.points.map((point) => ({
                                x: point.x,
                                y: point.y,
                            })),
                        } as ChangedElement),
                ),
            )
        }
    }, [orignalSize])

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
            </div>
            <div style={{ backgroundColor: '#aaa' }}>
                <DrawZone
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/250px-Image_created_with_a_mobile_phone.png"
                    elements={elements}
                    onChange={(elements: ChangedElement[]) =>
                        setElements(elements)
                    }
                    remove={(id) =>
                        setElements((el) => el.filter((e) => e.id !== id))
                    }
                    scale={scale}
                    mode={move ? 'move' : mode}
                    showMarker={showMarker}
                    setOriginalSize={setOriginalSize}
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
        </div>
    )
}

export function Polygons({}) {
    const originalElements = [
        /*
        {
            id: 'poly2',
            points: [
                { x: 0, y: 0 },
                { x: 125, y: 125 },
                { x: 62.5, y: 250 },
            ],
        },
        {
            id: 'poly3',
            points: [
                { x: 25, y: 25 },
                { x: 100, y: 100 },
                { x: 62.5, y: 200 },
            ],
        },
        {
            id: 'poly1',
            points: [
                { x: 50, y: 75 },
                { x: 50, y: 212.5 },
                { x: 150, y: 200 },
                { x: 200, y: 50 },
            ],
        },
        */
        {
            id: 'poly2',
            points: [
                { x: 37, y: 26 },
                { x: 125, y: 188 },
                { x: 250, y: 188 },
                { x: 250, y: 94 },
            ],
            fillColor: '#00ff00',
            strokeColor: '#00ff00',
        },
    ]
    const [scale, setScale] = useState(1)
    const mode = 'path'
    const [move, setMove] = useState(false)
    const [elements, setElements] = useState<Array<Partial<ChangedElement>>>([])
    const [showMarker, setShowMarker] = useState(false)
    const [orignalSize, setOriginalSize] = useState<Size>()

    useEffect(() => {
        if (orignalSize) {
            setElements(
                originalElements.map(
                    (element) =>
                        ({
                            ...element,
                            points: element.points.map((point) => ({
                                x: point.x,
                                y: point.y,
                            })),
                        } as ChangedElement),
                ),
            )
        }
    }, [orignalSize])

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
            </div>
            <div style={{ backgroundColor: '#aaa' }}>
                <DrawZone
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/250px-Image_created_with_a_mobile_phone.png"
                    elements={elements}
                    onChange={(elements: ChangedElement[]) =>
                        setElements(elements)
                    }
                    remove={(id) =>
                        setElements((el) => el.filter((e) => e.id !== id))
                    }
                    scale={scale}
                    mode={move ? 'move' : mode}
                    showMarker={showMarker}
                    setOriginalSize={setOriginalSize}
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
        </div>
    )
}

export function ScaleIn({}) {
    const originalElements = [
        {
            id: 'poly2',
            points: [
                { x: 2520, y: 1410 },
                { x: 1450, y: 3760 },
                { x: 3550, y: 3580 },
                { x: 3420, y: 1930 },
            ],
            fillColor: '#00ff00',
            strokeColor: '#00ff00',
        },
    ]
    const [scale, setScale] = useState(1)
    const mode = 'path'
    const [move, setMove] = useState(false)
    const [elements, setElements] = useState<Array<Partial<ChangedElement>>>([])
    const [showMarker, setShowMarker] = useState(false)
    const [orignalSize, setOriginalSize] = useState<Size>()

    useEffect(() => {
        if (orignalSize) {
            setElements(
                originalElements.map(
                    (element) =>
                        ({
                            ...element,
                            points: element.points.map((point) => ({
                                x: point.x,
                                y: point.y,
                            })),
                        } as ChangedElement),
                ),
            )
        }
    }, [orignalSize])

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
            </div>
            <div style={{ backgroundColor: '#aaa', width: '500px', height: '500px' }}>
                <DrawZone
                    src="https://picsum.photos/seed/drawzone/5000/4000"
                    elements={elements}
                    onChange={(elements: ChangedElement[]) =>
                        setElements(elements)
                    }
                    remove={(id) =>
                        setElements((el) => el.filter((e) => e.id !== id))
                    }
                    scale={scale}
                    mode={move ? 'move' : mode}
                    showMarker={showMarker}
                    setOriginalSize={setOriginalSize}
                    sizeMode='fit'
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
        </div>
    )
}

export function ScaleOut({}) {
    const originalElements = [
        {
            id: 'rect1',
            points: [
                { x: 125, y: 94 },
                { x: 250, y: 1 },
            ],
            fillColor: '#00ff00',
            strokeColor: '#00ff00',
        },
    ]
    const [scale, setScale] = useState(1)
    const mode = 'draw'
    const [move, setMove] = useState(false)
    const [elements, setElements] = useState<Array<Partial<ChangedElement>>>([])
    const [showMarker, setShowMarker] = useState(false)
    const [orignalSize, setOriginalSize] = useState<Size>()

    useEffect(() => {
        if (orignalSize) {
            setElements(
                originalElements.map(
                    (element) =>
                        ({
                            ...element,
                            points: element.points.map((point) => ({
                                x: point.x,
                                y: point.y,
                            })),
                        } as ChangedElement),
                ),
            )
        }
    }, [orignalSize])

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
            </div>
            <div style={{ backgroundColor: '#aaa', width: '500px', height: '500px' }}>
                <DrawZone
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/250px-Image_created_with_a_mobile_phone.png"
                    elements={elements}
                    onChange={(elements: ChangedElement[]) =>
                        setElements(elements)
                    }
                    remove={(id) =>
                        setElements((el) => el.filter((e) => e.id !== id))
                    }
                    scale={scale}
                    mode={move ? 'move' : mode}
                    showMarker={showMarker}
                    setOriginalSize={setOriginalSize}
                    sizeMode='fit'
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
        </div>
    )
}

export function None({}) {
    const [scale, setScale] = useState(1)
    const mode = 'none'
    const [move, setMove] = useState(false)
    const [elements, setElements] = useState<Array<Partial<ChangedElement>>>([])
    const [showMarker, setShowMarker] = useState(false)
    const [orignalSize, setOriginalSize] = useState<Size>()

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
            </div>
            <div style={{ backgroundColor: '#aaa', width: '500px', height: '500px' }}>
                <DrawZone
                    src="https://picsum.photos/seed/drawzone/5000/4000"
                    elements={elements}
                    onChange={(elements: ChangedElement[]) =>
                        setElements(elements)
                    }
                    remove={(id) =>
                        setElements((el) => el.filter((e) => e.id !== id))
                    }
                    scale={scale}
                    mode={move ? 'move' : mode}
                    showMarker={showMarker}
                    setOriginalSize={setOriginalSize}
                    sizeMode='fit'
                />
            </div>
        </div>
    )
}
