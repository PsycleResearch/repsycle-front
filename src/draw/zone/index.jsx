import React, {useState, useEffect, useRef, useReducer} from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { SVG } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.draggable.js';
import interact from 'interactjs';

function setupDrawRect({svg, svgRect, onChange = null}) {
    let startPosition;
    let overlayRect;

    function handleStartDrawing(e) {
        startPosition = {
            x: e.clientX - svgRect.left,
            y: e.clientY - svgRect.top
        };

        if (!overlayRect) {
            overlayRect = svg.rect(0, 0)
                .fill({opacity: 0.2}).stroke({color: '#000', width: 2, opacity: .5});
        }

        overlayRect.move(startPosition.x, startPosition.y);
    }

    function handleDrawing(e) {
        if (overlayRect) {
            const currentPosition = {
                x: e.clientX - svgRect.left,
                y: e.clientY - svgRect.top
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
        if (e.target.parentNode === svg.node) {
            return;
        }

        const currentPosition = {
            x: e.clientX - svgRect.left,
            y: e.clientY - svgRect.top
        };

        // Prevent adding very small rects (mis-clicks).
        if (Math.abs(currentPosition.x - startPosition.x) <= 2) {
            return;
        }

        const rect = drawRect({
            svg,
            svgRect,
            x: currentPosition.x > startPosition.x ? startPosition.x : currentPosition.x,
            y: currentPosition.y > startPosition.y ? startPosition.y : currentPosition.y,
            width: Math.abs(currentPosition.x - startPosition.x),
            height: Math.abs(currentPosition.y - startPosition.y),
            onChange: () => onChange()
        });

        if (onChange) {
            onChange();
        }
    }

    function handleClick(e) {
        // If click on main svg, and not an element, deselect everything.
        if (e.target === svg.node) {
            svg.each(function() {
                this.fire('deselect');
            });
        }
    }

    return {
        on: () => {
            svg.on('mousedown', handleStartDrawing);
            svg.on('mousemove', handleDrawing);
            svg.on('mouseup', handleStopDrawing);
            svg.on('click', handleClick);
        },
        off: () => {
            svg.off('mousedown', handleStartDrawing);
            svg.off('mousemove', handleDrawing);
            svg.off('mouseup', handleStopDrawing);
            svg.off('click', handleClick);
        }
    }
}

function drawRect({
    svg,
    svgRect,
    x, 
    y, 
    width, 
    height, 
    disabled = false, 
    strokeColor = '#fff',
    onChange = null
}) {
    if (!svg || !svgRect) {
        return;
    }

    const rect = svg.rect(width, height);
    rect.move(x, y);
    rect.fill({opacity: 0.2});
    rect.stroke({color: strokeColor, width: 2, opacity: 1});
    rect.css('touch-action', 'none');  // silence interactjs warning.

    // Custom events.
    rect.on('select', () => {
        // Deselect all 
        svg.each(function() {
            this.fire('deselect');
        });
        rect.stroke({color: '#02A9C7'});
        rect.data('selected', true);

        if (onChange) {
            onChange();
        }
    });
    rect.on('deselect', () => {
        rect.stroke({color: strokeColor});
        rect.data('selected', false);

        if (onChange) {
            onChange();
        }
    });
    rect.on('remove', () => {
        rect.remove();

        if (onChange) {
            onChange();
        }
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

                        if (onChange) {
                            onChange();
                        }
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

                        if (onChange) {
                            onChange();
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

    return rect;
}

export default function DrawZone({
    style,
    src, 
    initialElements, 
    renderElementOptions,
    onChange,
    children
}) {
    const svgRef = useRef(null);
    const [svg, setSvg] = useState(null);
    const [svgRect, setSvgRect] = useState(null);
    const [elements, setElements] = useState([]);

    function _onChange() {
        setElements(svg.children());
        if (onChange) {
            onChange(svg.children().map(element => {
                const box = element.bbox();

                return {
                    element,
                    coordinates: [
                        box.x / svgRect.width,
                        box.y / svgRect.height,
                        box.x2 / svgRect.width,
                        box.y2 / svgRect.height
                    ]
                };
            }));
        }
    }

    // Draw setup.
    useEffect(() => {
        if (!src || !svgRef.current) {
            return;
        }

        const image = new Image();
        image.onload = () => {
            svgRef.current.style.height = `${(svgRef.current.offsetWidth * image.height) / image.width}px`;
            svgRef.current.style.backgroundImage = `url('${image.src}')`;
            svgRef.current.style.backgroundSize = "cover";

            const rect = svgRef.current.getBoundingClientRect();
            const _svgRect = {
                x: rect.x,
                y: rect.y,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right,
                top: rect.top,
                width: rect.width,
                height: (svgRef.current.offsetWidth * image.height) / image.width  // Make sure height is correct
            };

            // Remove old svg.
            if (svg) {
                svg.remove();
            }

            setSvg(SVG().addTo(svgRef.current).size('100%', '100%'));
            setSvgRect(_svgRect);
        };
        image.src = src;

    }, [src, svgRef]);

    useEffect(() => {
        if (!svg || !svgRect) {
            return;
        }

        // Draw initialElements if there are any
        if (initialElements) {
            initialElements.forEach(coordinates => drawRect({
                svg,
                svgRect,
                x: coordinates[0] * svgRect.width,
                y: coordinates[1] * svgRect.height,
                width: (coordinates[2] * svgRect.width) - (coordinates[0] * svgRect.width),
                height: (coordinates[3] * svgRect.height) - (coordinates[1] * svgRect.height),
                onChange: () => _onChange()
            }));
        }

        const drawSetup = setupDrawRect({
            svg, 
            svgRect, 
            onChange: () => _onChange()
        });
        drawSetup.on();

        return () => {
            drawSetup.off();
        }
    }, [svg, svgRect]);

    return (
        <div 
            style={{
                ...style,
                display: "inline-block"
            }}
        >
            {src &&
                <div 
                    ref={svgRef}
                    style={{                        
                        position: "relative",
                        cursor: "crosshair"
                    }}
                >
                    {children}
                </div>
            }
        </div>
    );

    
    ;
};

DrawZone.displayName = 'DrawZone';

DrawZone.propTypes = {
    src: PropTypes.string,
    initialElements: PropTypes.array,
    onSubmit: PropTypes.func
};
