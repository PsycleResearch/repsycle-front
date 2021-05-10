import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export function Element({color}) {
    return null;
}

export function Point({x, y, size = 5, fill="white", ...props}) {
    const [_size, setSize] = useState();

    useEffect(() => {
        setSize(size);
    }, []);

    return (
        <circle 
            cx={x}
            cy={y}
            r={_size}
            fill={fill}
            onMouseEnter={() => setSize(size * 1.2)}
            onMouseLeave={() => setSize(size)}
            {...props}
        />
    );
}

export function Line({startX, startY, endX, endY, fill="white"}) {
    return (
        <line 
            x1={startX} 
            y1={startY}
            x2={endX}
            y2={endY}
            stroke="white"
            strokeWidth={2}
        />
    );
}

export function Rect({startX, startY, endX, endY, fill="white"}) {
    const x1 = endX > startX ? startX : endX;
    const y1 = endY > startY ? startY : endY;
    const x2 = endX > startX ? endX : startX;
    const y2 = endY > startY ? endY : startY;

    return (
        <rect
            x={x1}
            y={y1}
            width={x2 - x1}
            height={y2 - y1}
            fill={fill}
        />
    );
}

export function Polygon({points, onPointClick}) {
    return (
        <React.Fragment>
            {points.map((point, index) =>
                <React.Fragment>
                    {index > 0 &&
                        <Line 
                            startX={points[index - 1].x} 
                            startY={points[index - 1].y}
                            endX={point.x}
                            endY={point.y}
                        />
                    }

                    <Point 
                        x={point.x}
                        y={point.y}
                        onClick={(e) => onPointClick(e, index)}
                    />

                    {index === points.length - 1 &&
                        <Line 
                            startX={point.x} 
                            startY={point.y}
                            endX={points[0].x}
                            endY={points[0].y}
                        />
                    }
                </React.Fragment>
            )}
        </React.Fragment>
    );
}

// TODO: absolute coordinates (percentage based)
export default function DrawZone({
    children, 
    width,
    height,
    mode = "rect",
    initialElements, 
    renderElement, 
    onChange
}) {
    const zone = useRef(null);
    const [zoneRect, setZoneRect] = useState(null);
    const [elements, setElements] = useState([]);
    const [mouseDown, setMouseDown] = useState(false);
    const [mouseStartPosition, setMouseStartPosition] = useState(null);
    const [mouseEndPosition, setMouseEndPosition] = useState(null);
    const [mousePosition, setMousePosition] = useState(null);
    const [pendingShape, setPendingShape] = useState(null);

    function getEventCoordinates(e) {
        if (!zoneRect) {
            return;
        }

        return {
            x: e.clientX - zoneRect.left,
            y: e.clientY - zoneRect.top
        };
    }

    function onMouseDown(e) {
        setMouseDown(true);
        setMouseStartPosition(getEventCoordinates(e));
    }

    function onMouseOver(e) {
    }

    function onMouseMove(e) {
        // if (mouseDown) {

        // }

        setMousePosition(getEventCoordinates(e));
    }

    function onMouseUp(e) {
        const position = getEventCoordinates(e);
        if (!position) {
            return;
        }

        setMouseDown(false);

        setMouseEndPosition(position);

        let shape = pendingShape;
        if (!shape) {
            shape = {coordinates: []};
        }

        if (mode === "rect") {
            shape.coordinates = [
                mouseStartPosition.x,
                mouseStartPosition.y,
                position.x,
                position.y
            ];
            setElements(old => [...old, shape]);
        } else if (mode === "poly") {
            shape.coordinates.push(position);
            setPendingShape(shape);
        }

        setMouseStartPosition(null);    
        setMousePosition(null);
    }

    function onPointClick(e, index) {
        // Don't go to mouseUp
        e.stopPropagation();

        // Only first point can be connected to close polygon.
        if (mode === "poly" && index === 0) {
            setElements(old => [...old, pendingShape]);
            setPendingShape(null);
        }
    }

    useEffect(() => {
        if (zone.current) {
            setZoneRect(zone.current.getBoundingClientRect());
        }
    }, [zone]);

    return (
        <div 
            style={{
                cursor: "crosshair", 
                position: "relative", 
                display: "inline-block"
            }}
            ref={zone}
            onMouseDown={onMouseDown}
            onMouseOver={onMouseOver}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
        >
            {children}

            <svg 
                style={{
                    position: "absolute", 
                    top: "0",
                    left: "0",
                    width: "100%", 
                    height: "100%"
                }}
            >
                {elements.map((shape, index) =>
                    mode === "poly" 
                    ? (
                        <Polygon 
                            key={index} 
                            points={shape.coordinates} 
                        />
                    ) : (
                        <Rect 
                            key={index}
                            startX={shape.coordinates[0]}
                            startY={shape.coordinates[1]}
                            endX={shape.coordinates[2]}
                            endY={shape.coordinates[3]}
                        />
                    )
                )}

                {mode === "rect" && mousePosition && mouseStartPosition &&
                    <Rect 
                        startX={mouseStartPosition.x}
                        startY={mouseStartPosition.y}
                        endX={mousePosition.x}
                        endY={mousePosition.y}
                    />
                }
                {mode === "poly" && pendingShape && 
                    <React.Fragment>
                        <Polygon 
                            points={pendingShape.coordinates} 
                            onPointClick={(e, index) => onPointClick(e, index)}
                        />

                        {mousePosition &&
                            <Line 
                                startX={pendingShape.coordinates[pendingShape.coordinates.length - 1].x} 
                                startY={pendingShape.coordinates[pendingShape.coordinates.length - 1].y}
                                endX={mousePosition.x}
                                endY={mousePosition.y}
                            />  
                        }  
                    </React.Fragment>
                }
            </svg>
        </div>
    );
};

DrawZone.displayName = 'DrawZone';

DrawZone.propTypes = {
};
