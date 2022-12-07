import { isTouchDevice } from '../utils'
import type { DrawZoneState } from './types'

export const MAX_SCALE = 4
export const SCALE_STEP = 0.25

export const DRAW_ZONE_INITIAL_STATE: DrawZoneState = {
    contentHidden: false,
    logicalScale: 1,
    markerVisible: false,
    move: false,
    positionLeft: 0,
    positionTop: 0,
    scale: 1,
}
/*
export const DRAW_ZONE_INITIAL_STATE: DrawZoneState = {
    contentHidden: false,
    markerVisible: false,
    move: false,
    viewBox: {
        x: 0,
        y: 0,
        height: 0,
        width: 0,
    },
    imageSize: {
        height: 0,
        width: 0,
    },
}
*/

export const xns = 'http://www.w3.org/1999/xlink'
export const CIRCLE_SIZE = 10
export const CIRCLE_BORDER_SIZE = (isTouchDevice ? 47 : 11) - CIRCLE_SIZE
export const blue = '#2BB1FD'
