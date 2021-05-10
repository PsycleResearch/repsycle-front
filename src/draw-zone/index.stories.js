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
                width: `${args.width || '800'}px`, 
                height: `${args.height || '500'}px`, 
                backgroundColor: "lightgray"
            }}
        ></div>
    </DrawZone>
);

export const Default = Template.bind({});
Default.args = {
    width: '800',
    height: '500',
    mode: 'rect',
    initialElements: [],
    onChange: (elements) => console.log(elements)
};
