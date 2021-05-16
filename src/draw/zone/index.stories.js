import React, { useState } from 'react';

import DrawZone from '.';

export default {
    title: 'Components/Draw/Zone',
    component: DrawZone,
};

export function Base({}) {
    const [elements, setElements] = useState([{
        points: [{x: 0.5, y: 0.5}, {x: 1, y: 1}]
    }]);

    return (
        <DrawZone 
            elements={elements}
            onChange={(elements) => setElements(elements)}
            disabled
        >
            <div style={{width: "500px", height: "500px", "backgroundColor": "blue"}}></div>

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
    );
};
