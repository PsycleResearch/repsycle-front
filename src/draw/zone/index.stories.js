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
        >
            <div style={{width: "500px", height: "500px", "backgroundColor": "blue"}}></div>
        </DrawZone>
    );
};
