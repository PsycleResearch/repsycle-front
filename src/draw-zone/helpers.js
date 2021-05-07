export function setupDrawRect({drawSVG, svgWrapperRect, handlers = {}}) {
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

export function drawRect({
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

    const removeButton = drawSVG.rect(10, 10);
    removeButton.move(x + width - 5, y - 5);
    removeButton.fill({color: '#F56565'});
    removeButton.stroke({color: '#fff', width: 1});
    removeButton.css('cursor', 'pointer');
    removeButton.on('click', () => {
        if (handlers.onRemove) {
            handlers.onRemove(rect);    
        }

        rect.remove();
        removeButton.remove();
    });

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
                        removeButton.move(x + event.rect.width - 5, y - 5);
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
                        removeButton.move(x + parseFloat(target.getAttribute('width') || 0) - 5, y - 5);
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
