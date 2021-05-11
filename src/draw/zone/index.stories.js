import React from 'react';

import DrawZone from '.';

export default {
    title: 'Components/Draw/Zone',
    component: DrawZone,
};

const Template = (args) => (
    <DrawZone {...args} />
);

export const Base = Template.bind({});
Base.args = {
    src: "https://via.placeholder.com/800",
    renderElementOptions: ({onRemove}) => (
        <button onClick={() => onRemove()}>test</button>
    )
};
