import React, {useState, useEffect, useLayoutEffect, useRef, useReducer} from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { SVG } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.draggable.js';
import interact from 'interactjs';

export function useDraw(ref, props = {
    onChange,
    disabled
}) {
    const [mode, setMode] = useState("mode");
    const [svg, setSvg] = useState(null);
    let startPosition;
    let overlayRect;

    const resizeObserver = new ResizeObserver(function(entries) {
        if (svg) {
            svg.remove();
        }
        setSvg(SVG().addTo(ref.current).size('100%', '100%'));
    });

    function getRelativeCoordinates(points) {
        const svgRect = svg.node.getBoundingClientRect();

        return points.map(({x, y}) => ({
            x: x * svgRect.width,
            y: y * svgRect.height
        }));
    }

    function getAbsoluteCoordinates(points) {
        const svgRect = svg.node.getBoundingClientRect();

        return points.map(({x, y}) => ({
            x: x / svgRect.width,
            y: y / svgRect.height
        }));
    }

    function onChange() {
        if (svg && props.onChange) {
            props.onChange(svg.children().map(elt => {
                const box = elt.bbox();
                return {
                    points: getAbsoluteCoordinates([
                        {x: box.x, y: box.y},
                        {x: box.x2, y: box.y2}
                    ])
                };
            }));
        }
    }

    function drawRect({
        points,
        disabled = props.disabled ? true : false, 
        stroke = {color: '#fff', width: 2, opacity: 1},
        fill = {color: '#000', opacity: 0.2}
    }) {
        if (!svg || !points || !points.length == 2) {
            return;
        }

        const rect = svg.rect(0, 0)
        rect.move(points[0].x, points[0].y);
        rect.width(Math.abs(points[1].x - points[0].x));
        rect.height(Math.abs(points[1].y - points[0].y));
        rect.fill(fill);
        rect.stroke(stroke);
        rect.css('touch-action', 'none');  // silence interactjs warning.

        // Custom events.
        rect.on('select', () => {
            // Deselect all 
            svg.each(function() {
                this.fire('deselect');
            });
            rect.stroke({color: '#02A9C7'});
            rect.data('selected', true);

            onChange();
        });
        rect.on('deselect', () => {
            rect.stroke(stroke);
            rect.data('selected', false);

            onChange();
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

                            onChange();
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

                            onChange();
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

    function onMouseDown(e) {
        const svgRect = svg.node.getBoundingClientRect();

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

    function onMouseMove(e) {
        if (overlayRect) {
            const svgRect = svg.node.getBoundingClientRect();
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

    function onMouseUp(e) {
        if (overlayRect) {
            overlayRect.remove();
            overlayRect = undefined;
        }

        // Prevent drawing new rect on rect dragend...
        if (e.target.parentNode === svg.node) {
            return;
        }

        const svgRect = svg.node.getBoundingClientRect();
        const currentPosition = {
            x: e.clientX - svgRect.left,
            y: e.clientY - svgRect.top
        };

        // Prevent adding very small rects (mis-clicks).
        if (Math.abs(currentPosition.x - startPosition.x) <= 2) {
            return;
        }

        const rect = drawRect({points: [
            {
                x: Math.min(startPosition.x, currentPosition.x),
                y: Math.min(startPosition.y, currentPosition.y)
            },
            {
                x: Math.max(startPosition.x, currentPosition.x),
                y: Math.max(startPosition.y, currentPosition.y)
            }
        ]});

        onChange();
    }

    function onClick(e) {
        // If click on main svg, and not an element, deselect everything.
        if (e.target === svg.node) {
            svg.each(function() {
                this.fire('deselect');
            });
        }
    }

    useLayoutEffect(() => {
        if (!ref.current) {
            return;
        }

        resizeObserver.observe(ref.current);

        return () => {
            resizeObserver.unobserve(ref.current);
        }
    }, [ref]);

    useLayoutEffect(() => {
        if (!svg) {
            return;
        }

        svg.css({
            cursor: !props.disabled && 'crosshair',
            position: 'absolute',
            top: '0',
            left: '0'
        });

        if (props.disabled) {
            return;
        }

        svg.on('mousedown', onMouseDown);
        svg.on('mousemove', onMouseMove);
        svg.on('mouseup', onMouseUp);
        svg.on('click', onClick);

        return () => {
            svg.off('mousedown', onMouseDown);
            svg.off('mousemove', onMouseMove);
            svg.off('mouseup', onMouseUp);
            svg.off('click', onClick);
        }
    }, [svg]);

    return {
        svg,
        draw: ({points, ...props}) => drawRect({
            ...props,
            points: getRelativeCoordinates(points)
        })
    }
}

export default function DrawZone({
    elements,
    onChange,
    children,
    disabled
}) {
    const svgRef = useRef(null);
    const {svg, draw} = useDraw(svgRef, {onChange, disabled});

    useLayoutEffect(() => {
        if (svg && elements && elements.length !== svg.children().length) {
            svg.clear();
            elements.forEach(element => draw(element));
        }
    }, [svg, elements]);

    return (
        <div style={{display: "inline-block"}}>
            <div 
                ref={svgRef}
                style={{                        
                    position: "relative"
                }}
            >
                {children}
            </div>
        </div>
    );
};

DrawZone.displayName = 'DrawZone';

DrawZone.propTypes = {
    src: PropTypes.string,
    elements: PropTypes.array,
    onSubmit: PropTypes.func
};
