import React from 'react';

import DrawZone from '.';

export default {
    title: 'Components/DrawZone',
    component: DrawZone,
};

const Template = (args) => (
    <DrawZone {...args}>
        <div 
            style={{
                width: `${args.width}px`, 
                height: `${args.height}px`, 
                backgroundColor: "lightgray"
            }}
        ></div>
    </DrawZone>
);

export const Rect = Template.bind({});
Rect.args = {
    width: '500',
    height: '500',
    mode: 'rect',
    initialElements: [],
    onChange: (elements) => console.log(elements)
};

export const Poly = Template.bind({});
Poly.args = {
    width: '500',
    height: '500',
    mode: 'poly',
    initialElements: [],
    onChange: (elements) => console.log(elements)
};
