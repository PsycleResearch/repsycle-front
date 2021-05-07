import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { SVG } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.draggable.js';

import { drawRect, setupDrawRect } from './helpers';

export default function DrawZone({
    children, 
    width,
    height,
    initialElements, 
    renderElement, 
    onChange
}) {
    // const svgWrapperRef = useRef(null);
    // const [wrapperRect, setWrapperRect] = useState(null);
    // const [svgElt, setSvgElt] = useState(null);
    // const [elements, setElements] = useState([]);

    // const drawHandlers = {
    //     onSelect: (elt) => setElements(old => [...old]),  // Trigger re-render
    //     onDeselect: (elt) => setElements(old => [...old]),  // Trigger re-render
    //     onRemove: (elt) => console.log(elt)
    // };

    // function onChange(elements) {
    //     setElements(elements);

    //     // let payload = [];

    //     // drawSVG.children().forEach(element => {
    //     //     if (element.data('crop') && !element.data('disabled')) {
    //     //         const box = element.bbox();

    //     //         const getX = (x) => (x * originalImage.width) / svgWrapperRect.width;
    //     //         const getY = (y) => (y * originalImage.height) / svgWrapperRect.height;

    //     //         payload.push({
    //     //             id: element.data('id'),
    //     //             x1: getX(box.x),
    //     //             y1: getY(box.y),
    //     //             x2: getX(box.x2),
    //     //             y2: getY(box.y2),
    //     //             image_width: originalImage.width,
    //     //             image_height: originalImage.height
    //     //         });
    //     //     }
    //     // });

    //     if (onChange) {
    //         onChange(elements);
    //     }
    // }

    // // Draw setup.
    // useEffect(() => {
    //     if (svgWrapperRef.current && width && height) {
    //         const wrapperElt = svgWrapperRef.current;
    //         wrapperElt.style.height = `${(wrapperElt.offsetWidth * image.height) / image.width}px`;
    //         wrapperElt.style.backgroundImage = `url('${image.src}')`;
    //         wrapperElt.style.backgroundSize = "cover";

    //         const rect = wrapperElt.getBoundingClientRect();
    //         setWrapperRect({
    //             x: rect.x,
    //             y: rect.y,
    //             bottom: rect.bottom,
    //             left: rect.left,
    //             right: rect.right,
    //             top: rect.top,
    //             width: rect.width,
    //             height: (wrapperElt.offsetWidth * height) / width  // Make sure height is correct
    //         });

    //         if (svgElt) {
    //             svgElt.remove();
    //         }
    //         setSvgElt(SVG().addTo("#svg-wrapper").size('100%', '100%'));
    //     }
    // }, [svgWrapperRef, width, height]);

    // // Setup drawing event handlers.
    // useEffect(() => {        
    //     if (!wrapperRect|| !svgElt) {
    //         return;
    //     }

    //     let drawSetup;
    //     const handlers = {
    //         ...drawHandlers,
    //         onStopDrawing: (elt) => {
    //             onElementsChange([...elements, elt])
    //         }
    //     };

    //     drawSetup = setupDrawRect({
    //         svgElt, 
    //         wrapperRect, 
    //         handlers
    //     });
    //     drawSetup.on();

    //     return () => {
    //         drawSetup.off();
    //     };
    // }, [svgElt, wrapperRect]);

    // // Draw saved annotations.
    // useEffect(() => {
    //     if (!initialElements || !svgElt || !wrapperRect) {
    //         return;
    //     }

    //     // Clear all before settings new ones.
    //     drawSVG.clear();
    //     onChange([]);

    //     // setElements(initialElements);

    //     // crops
    //     //     .filter(c => c.image_width === originalImage.width && c.image_height === originalImage.height)
    //     //     .forEach(c => {
    //     //         const x = (c.x1 * svgWrapperRect.width) / originalImage.width;
    //     //         const y = (c.y1 * svgWrapperRect.height) / originalImage.height;
    //     //         const width = ((c.x2 * svgWrapperRect.width) / originalImage.width) - x;
    //     //         const height = ((c.y2 * svgWrapperRect.height) / originalImage.height) - y;

    //     //         const rect = drawRect({
    //     //             drawSVG,
    //     //             svgWrapperRect,
    //     //             x,
    //     //             y,
    //     //             width,
    //     //             height,
    //     //             handlers: drawHandlers
    //     //         });
    //     //         rect.data('id', c.id);
    //     //         onElementsChange([...elements, rect]);
    //     //     });
    // }, [initialElements, svgElt, wrapperRect]);

    return (
        <div style={{width: "800px"}}>
            <div 
                id="svg-wrapper"
                ref={svgWrapperRef}
                className="w-100"
                style={{cursor: "crosshair"}}
            >
                {children}
            </div>
        </div>
    );
};

DrawZone.displayName = 'DrawZone';

DrawZone.propTypes = {
};
