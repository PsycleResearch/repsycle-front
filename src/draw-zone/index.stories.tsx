import React, { useState } from 'react';

import DrawZone from '.';

export default {
    title: 'Components/DrawZone',
    component: DrawZone,
};

export function Base({}) {
    const [scale, setScale] = useState(1);
    const [mode, setMode] = useState("draw");
    const [elements, setElements] = useState([{
        points: [{x: 0.5, y: 0.5}, {x: 1, y: 1}]
    }]);

    return (
        <div>
            <div>
                <button onClick={() => setScale(old => old - 0.25)}>
                    Reduire
                </button>
                <button onClick={() => setScale(old => old + 0.25)}>
                    Agrandir
                </button>
                <button onClick={() => setMode(old => old === "draw" ? "move" : "draw")}>
                    {mode === "draw" ? "Bouger" : "Dessiner"}
                </button>
            </div>
            <DrawZone 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/250px-Image_created_with_a_mobile_phone.png" 
                elements={elements}
                onChange={(elements) => setElements(elements)}
                scale={scale}
                mode={mode}
            >
                {elements.map((element, index) =>
                    <div
                        key={index}
                        style={{
                            position: "absolute",
                            zIndex: "10",
                            top: `${element.points[0].y*100}%`,
                            left: `${element.points[0].x*100}%`
                        }}
                    >
                        <button 
                            onClick={() => setElements(elements.filter((_, idx) => index !== idx))}
                        >
                            supprimer
                        </button>
                    </div>
                )}
            </DrawZone>
        </div>
    );
};
