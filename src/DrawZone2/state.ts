import { noop } from 'lodash'
import { createContext } from 'react'
import {
    DrawZone2Controls,
    DrawZone2PrivateStateContext,
    DrawZone2State,
} from './types'

export const DrawZone2Context = createContext<DrawZone2State>({
    src: '',
    pictureSize: {
        height: 0,
        width: 0,
    },
})
export const DrawZone2ControlsContext = createContext<DrawZone2Controls>({
    contentHidden: false,
    markerVisible: false,
    move: false,
    redraw: noop,
    reset: noop,
    toggleContent: noop,
    toggleMarker: noop,
    toggleMove: noop,
    zoomIn: noop,
    zoomOut: noop,
})
export const DrawZone2PrivateContext =
    createContext<DrawZone2PrivateStateContext>({
        logicalScale: 1,
        positionLeft: 0,
        positionTop: 0,
        redraw: false,
        scale: 1,
        setScale: noop,
        setPosition: noop,
    })
