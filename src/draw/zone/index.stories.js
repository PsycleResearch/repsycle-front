import React from 'react';

import DrawZone from '.';

export default {
    title: 'Components/Draw/Zone',
    component: DrawZone,
};

const Template = (args) => (
    <DrawZone {...args} />
);

export const Base = () => (
    <DrawZone 
        style={{width: "500px"}}
        src="https://via.placeholder.com/500"
        initialElements={[
            [0.5, 0.5, 1, 1]
        ]}
        onChange={(elements) => console.log(elements)}
    >

    </DrawZone>
);
