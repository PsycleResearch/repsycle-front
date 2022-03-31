import { Dispatch, createContext } from 'react'
import {
    DrawZoneStateAction,
    DrawZoneStateActionType,
    DrawZoneStateInternal,
    MAX_SCALE,
    SCALE_STEP,
} from './types'

export const drawZoneInitialState: DrawZoneStateInternal = {
    scale: 1,
    isMarkerShown: false,
    isDisabled: false,
    originalSize: undefined,
    logicalScale: 1,
    positionTop: 0,
    positionLeft: 0,
    redraw: false,
}

export function drawZoneReducer(
    state: DrawZoneStateInternal,
    action: DrawZoneStateAction,
): DrawZoneStateInternal {
    switch (action.type) {
        case DrawZoneStateActionType.RESET:
            return {
                ...state,
                logicalScale: 1,
                positionTop: 0,
                positionLeft: 0,
            }
        case DrawZoneStateActionType.SET_SCALE:
            return {
                ...state,
                scale: action.payload,
            }
        case DrawZoneStateActionType.ZOOM_IN:
            return {
                ...state,
                logicalScale: Math.min(
                    state.logicalScale + SCALE_STEP,
                    MAX_SCALE,
                ),
            }
        case DrawZoneStateActionType.ZOOM_OUT:
            return {
                ...state,
                logicalScale: Math.max(
                    SCALE_STEP,
                    state.logicalScale - SCALE_STEP,
                ),
            }
        case DrawZoneStateActionType.SHOW_MARKER:
            return {
                ...state,
                isMarkerShown: true,
            }
        case DrawZoneStateActionType.HIDE_MARKER:
            return {
                ...state,
                isMarkerShown: false,
            }
        case DrawZoneStateActionType.DISABLE:
            return {
                ...state,
                isDisabled: true,
            }
        case DrawZoneStateActionType.ENABLE:
            return {
                ...state,
                isDisabled: false,
            }
        case DrawZoneStateActionType.SET_ORIGINAL_SIZE:
            return {
                ...state,
                originalSize: action.payload,
            }
        case DrawZoneStateActionType.SET_POSITION:
            return {
                ...state,
                positionTop: action.payload.top,
                positionLeft: action.payload.left,
            }
        case DrawZoneStateActionType.FORCE_REDRAW:
            return {
                ...state,
                redraw: !state.redraw,
            }
        default:
            return state
    }
}

export const DrawZoneContext = createContext<{
    readonly state: DrawZoneStateInternal
    readonly dispatch: Dispatch<DrawZoneStateAction>
}>({
    state: drawZoneInitialState,
    dispatch: () => undefined,
})
