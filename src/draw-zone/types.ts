export type DrawZoneMode = 'draw' | 'move' | 'none'
export type DrawZoneShape = 'rect' | 'poly' | 'none'
export type SizeMode = 'auto' | 'fit'

export interface Size {
    readonly width: number
    readonly height: number
}
export interface Point {
    readonly x: number
    readonly y: number
}
export interface ChangedElement {
    readonly id: string
    readonly selected?: boolean
    readonly points: Point[]
    readonly label: string
    readonly rect: {
        readonly height: number
        readonly width: number
        readonly x: number
        readonly y: number
    }
    readonly color?: string
}

export type DrawZoneState = {
    readonly scale: number
    readonly isMarkerShown: boolean
    readonly isDisabled: boolean
    readonly originalSize: Size | undefined
}

export const MAX_SCALE = 4
export const SCALE_STEP = 0.25

export type DrawZoneStateInternal = DrawZoneState & {
    readonly logicalScale: number
    readonly positionTop: number
    readonly positionLeft: number
    readonly redraw: boolean
}

export enum DrawZoneStateActionType {
    RESET,
    SET_SCALE,
    ZOOM_IN,
    ZOOM_OUT,
    CHANGE_MODE,
    CHANGE_SIZE_MODE,
    SHOW_MARKER,
    HIDE_MARKER,
    DISABLE,
    ENABLE,
    SET_ORIGINAL_SIZE,
    SET_POSITION,
    FORCE_REDRAW,
}

export type DrawZoneStateAction =
    | { readonly type: DrawZoneStateActionType.RESET }
    | {
          readonly type: DrawZoneStateActionType.SET_SCALE
          readonly payload: number
      }
    | {
          readonly type: DrawZoneStateActionType.ZOOM_IN
      }
    | {
          readonly type: DrawZoneStateActionType.ZOOM_OUT
      }
    | {
          readonly type: DrawZoneStateActionType.SHOW_MARKER
      }
    | {
          readonly type: DrawZoneStateActionType.HIDE_MARKER
      }
    | {
          readonly type: DrawZoneStateActionType.DISABLE
      }
    | {
          readonly type: DrawZoneStateActionType.ENABLE
      }
    | {
          readonly type: DrawZoneStateActionType.SET_ORIGINAL_SIZE
          readonly payload: Size | undefined
      }
    | {
          readonly type: DrawZoneStateActionType.SET_POSITION
          readonly payload: {
              readonly top: number
              readonly left: number
          }
      }
    | {
          readonly type: DrawZoneStateActionType.FORCE_REDRAW
      }
