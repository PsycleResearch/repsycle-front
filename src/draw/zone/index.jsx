import React, {useState, useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { SVG } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.draggable.js';
import * as interact from 'interactjs';

function setupDrawRect({drawSVG, svgWrapperRect, handlers = {}}) {
    let startPosition;
    let overlayRect;

    function handleStartDrawing(e) {
        startPosition = {
            x: e.clientX - svgWrapperRect.left,
            y: e.clientY - svgWrapperRect.top
        };

        if (!overlayRect) {
            overlayRect = drawSVG.rect(0, 0)
                .fill({opacity: 0.2}).stroke({color: '#000', width: 2, opacity: .5});
        }

        overlayRect.move(startPosition.x, startPosition.y);
    }

    function handleDrawing(e) {
        if (overlayRect) {
            const currentPosition = {
                x: e.clientX - svgWrapperRect.left,
                y: e.clientY - svgWrapperRect.top
            };

            overlayRect.move(
                currentPosition.x > startPosition.x ? startPosition.x : currentPosition.x,
                currentPosition.y > startPosition.y ? startPosition.y : currentPosition.y
            );
            overlayRect.width(Math.abs(currentPosition.x - startPosition.x));
            overlayRect.height(Math.abs(currentPosition.y - startPosition.y));
        }
    }

    function handleStopDrawing(e) {
        if (overlayRect) {
            overlayRect.remove();
            overlayRect = undefined;
        }

        // Prevent drawing new rect on rect dragend...
        if (e.target.parentNode === drawSVG.node) {
            return;
        }

        const currentPosition = {
            x: e.clientX - svgWrapperRect.left,
            y: e.clientY - svgWrapperRect.top
        };

        // Prevent adding very small rects (mis-clicks).
        if (Math.abs(currentPosition.x - startPosition.x) <= 2) {
            return;
        }

        const rect = drawRect({
            drawSVG,
            svgWrapperRect,
            x: currentPosition.x > startPosition.x ? startPosition.x : currentPosition.x,
            y: currentPosition.y > startPosition.y ? startPosition.y : currentPosition.y,
            width: Math.abs(currentPosition.x - startPosition.x),
            height: Math.abs(currentPosition.y - startPosition.y),
            handlers
        });

        if (handlers.onStopDrawing) {
            handlers.onStopDrawing(rect);
        }
    }

    function handleClick(e) {
        // If click on main svg, and not an element, deselect everything.
        if (e.target === drawSVG.node) {
            drawSVG.each(function() {
                this.fire('deselect');
            });
        }
    }

    return {
        on: () => {
            drawSVG.on('mousedown', handleStartDrawing);
            drawSVG.on('mousemove', handleDrawing);
            drawSVG.on('mouseup', handleStopDrawing);
            drawSVG.on('click', handleClick);
        },
        off: () => {
            drawSVG.off('mousedown', handleStartDrawing);
            drawSVG.off('mousemove', handleDrawing);
            drawSVG.off('mouseup', handleStopDrawing);
            drawSVG.off('click', handleClick);
        }
    }
}

function drawRect({
    drawSVG,
    svgWrapperRect,
    x, 
    y, 
    width, 
    height, 
    disabled = false, 
    strokeColor = '#fff',
    handlers = {}
}) {
    if (!drawSVG || !svgWrapperRect) {
        return;
    }

    const rect = drawSVG.rect(width, height);
    rect.move(x, y);
    rect.fill({opacity: 0.2});
    rect.stroke({color: strokeColor, width: 2, opacity: 1});
    rect.css('touch-action', 'none');  // silence interactjs warning.

    // Custom events.
    rect.on('select', () => {
        // Deselect all 
        drawSVG.each(function() {
            this.fire('deselect');
        });
        rect.stroke({color: '#02A9C7'});
        rect.data('selected', true);

        if (handlers.onSelect) {
            handlers.onSelect(rect);
        }
    });
    rect.on('deselect', () => {
        rect.stroke({color: strokeColor});
        rect.data('selected', false);

        if (handlers.onDeselect) {
            handlers.onDeselect(rect);
        }
    });
    rect.on('remove', () => {
        rect.remove();
    });

    if (!disabled) {
        rect.css('cursor', 'move');

        rect.on('click', (e) => {
            rect.fire('select');
        });
        rect.on('mousedown', (e) => {
            e.stopPropagation();
        })

        interact(rect.node)
            .resizable({
                edges: { left: true, right: true, bottom: true, top: true },
                listeners: {
                    move (event) {
                        var target = event.target;

                        var x = (parseFloat(target.getAttribute('x')) || 0);
                        var y = (parseFloat(target.getAttribute('y')) || 0);

                        target.setAttribute('width', event.rect.width + 'px');
                        target.setAttribute('height', event.rect.height + 'px');

                        // translate when resizing from top or left edges
                        x += event.deltaRect.left;
                        y += event.deltaRect.top;

                        target.setAttribute('x', x);
                        target.setAttribute('y', y);
                    }
                },
                modifiers: [
                    interact.modifiers.restrictEdges({
                        outer: 'parent'
                    }),
                    interact.modifiers.restrictSize({
                        min: { width: 20, height: 20 }
                    })
                ]
            })
            .draggable({
                listeners: {
                    start (event) {
                        var _rect = event.target.instance;
                        _rect.fire('select');
                    },
                    move (event) {
                        var target = event.target;

                        var x = (parseFloat(target.getAttribute('x')) || 0) + event.dx;
                        var y = (parseFloat(target.getAttribute('y')) || 0) + event.dy;
                        target.setAttribute('x', x);
                        target.setAttribute('y', y);

                        if (handlers.onDragging) {
                            handlers.onDragging();
                        }
                    }
                },
                modifiers: [
                    interact.modifiers.restrictRect({
                        restriction: 'parent',
                    })
                ],
                cursorChecker: (action, interactable, element, interacting) => {
                    switch (action.axis) {
                        case 'x': return 'ew-resize'
                        case 'y': return 'ns-resize'
                        default: return interacting ? 'grabbing' : 'move'
                    }
                }
            });
    }

    rect.data('disabled', disabled);
    rect.data('crop', true);

    return rect;
}

export default function DrawZone({
    src, 
    initialElements, 
    onRemove,
    renderElementOptions
}) {
    const [originalImage, setOriginalImage] = useState(null);
    const [svgWrapperRect, setSvgWrapperRect] = useState(null);
    const [drawSVG, setDrawSVG] = useState(null);
    const [elements, setElements] = useState([]);
    const svgWrapperRef = useRef(null);

    function _onRemove(index) {
        elements[index].fire('remove');

        if (elements[index].data('id')) {
            onRemove(elements[index].data('id'));
        }

        setElements(old => old.filter((_, idx) => idx !== index));
    }

    const drawHandlers = {
        onSelect: (elt) => setElements(oldElements => [...oldElements]),  // Trigger re-render
        onDeselect: (elt) => setElements(oldElements => [...oldElements]),  // Trigger re-render
        onDragging: (elt) => setElements(oldElements => [...oldElements]),  // Trigger re-render
    };

    // Draw setup.
    useEffect(() => {
        if (src) {
            const svgWrapper = svgWrapperRef.current;
            const image = new Image();
            image.onload = () => {
                svgWrapper.style.height = `${(svgWrapper.offsetWidth * image.height) / image.width}px`;
                svgWrapper.style.backgroundImage = `url('${image.src}')`;
                svgWrapper.style.backgroundSize = "cover";

                const rect = svgWrapper.getBoundingClientRect();
                setSvgWrapperRect({
                    x: rect.x,
                    y: rect.y,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                    top: rect.top,
                    width: rect.width,
                    height: (svgWrapper.offsetWidth * image.height) / image.width  // Make sure height is correct
                });
            };
            image.src = src;
            
            setOriginalImage(image);

            if (drawSVG) {
                drawSVG.remove();
            }
            setDrawSVG(SVG().addTo("#svg-wrapper").size('100%', '100%'));
        }
    }, [src]);

    // Setup drawing event handlers.
    useEffect(() => {        
        if (!svgWrapperRect|| !drawSVG) {
            return;
        }

        let drawSetup;
        const handlers = {
            ...drawHandlers,
            onStopDrawing: (elt) => {
                setElements(oldElements => [...oldElements, elt])
            }
        };

        drawSetup = setupDrawRect({
            drawSVG, 
            svgWrapperRect, 
            handlers
        });
        drawSetup.on();

        return () => {
            drawSetup.off();
        };
    }, [drawSVG, svgWrapperRect]);

    // Draw saved annotations.
    useEffect(() => {
        if (!initialElements || !drawSVG || !originalImage || !svgWrapperRect) {
            return;
        }

        // Clear all before settings new ones.
        drawSVG.clear();
        setElements([]);

        initialElements
            .filter(c => c.image_width === originalImage.width && c.image_height === originalImage.height)
            .forEach(c => {
                const x = (c.x1 * svgWrapperRect.width) / originalImage.width;
                const y = (c.y1 * svgWrapperRect.height) / originalImage.height;
                const width = ((c.x2 * svgWrapperRect.width) / originalImage.width) - x;
                const height = ((c.y2 * svgWrapperRect.height) / originalImage.height) - y;

                const rect = drawRect({
                    drawSVG,
                    svgWrapperRect,
                    x,
                    y,
                    width,
                    height,
                    handlers: drawHandlers
                });
                rect.data('id', c.id);
                setElements(oldElements => [...oldElements, rect]);
            });
    }, [initialElements, drawSVG, originalImage, svgWrapperRect]);

    // function _onSubmit() {
    //     if (!drawSVG || !originalImage || !svgWrapperRect) {
    //         return;
    //     }

    //     let payload = [];

    //     drawSVG.children().forEach(element => {
    //         if (element.data('crop') && !element.data('disabled')) {
    //             const box = element.bbox();

    //             const getX = (x) => (x * originalImage.width) / svgWrapperRect.width;
    //             const getY = (y) => (y * originalImage.height) / svgWrapperRect.height;

    //             payload.push({
    //                 id: element.data('id'),
    //                 x1: getX(box.x),
    //                 y1: getY(box.y),
    //                 x2: getX(box.x2),
    //                 y2: getY(box.y2),
    //                 image_width: originalImage.width,
    //                 image_height: originalImage.height
    //             });
    //         }
    //     });

    //     onSubmit(payload);
    // }

    return (
        <div style={{display: "inline-block"}}>
            {src &&
                <div 
                    id="svg-wrapper"
                    ref={svgWrapperRef}
                    style={{cursor: "crosshair", position: "relative"}}
                >
                    {renderElementOptions && elements.map((elt, index) =>
                        elt.data('selected') === true &&
                            <div
                                style={{
                                    position: "absolute",
                                    top: `${elt.y()}px`,
                                    left: `${elt.x()}px`
                                }}
                            >
                                {renderElementOptions({
                                    onRemove: () => _onRemove(index)
                                })}
                            </div>
                    )}
                </div>
            }
        </div>
    );

    
    ;
};

DrawZone.displayName = 'DrawZone';

DrawZone.propTypes = {
    src: PropTypes.string,
    initialElements: PropTypes.arrayOf(PropTypes.object.isRequired),
    onSubmit: PropTypes.func
};
