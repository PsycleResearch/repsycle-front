import { BGR } from 'src/types'

export type DrawZone2Mode = 'draw' | 'none'
export type DrawZone2Shape = 'rect' | 'poly' | 'none'
export type DrawZoneFitMode = 'auto' | 'fit'

export interface Size {
    readonly width: number
    readonly height: number
}
export interface Point {
    readonly x: number
    readonly y: number
}
export interface Rect extends Size, Point {}

export interface DrawZoneElement {
    readonly id: string | undefined
    readonly selected?: boolean
    readonly points: Point[]
    readonly label: string
    readonly color?: BGR
    readonly rect: Rect
}

export type DrawZone2State = {
    readonly src: string
    readonly pictureSize: Size
    readonly disabled?: boolean
}

export type DrawZone2PrivateState = {
    readonly scale: number
    readonly logicalScale: number
    readonly positionTop: number
    readonly positionLeft: number
    readonly redraw: boolean
}
export type DrawZone2PrivateStateContext = DrawZone2PrivateState & {
    readonly setPosition: (top: number, left: number) => void
    readonly setScale: (scale: number) => void
}

export enum PictureLoadingState {
    Idle,
    Loading,
    Error,
    Done,
}

export type DrawZone2Controls = {
    readonly contentHidden: boolean
    readonly markerVisible: boolean
    readonly move: boolean
    readonly redraw: () => void
    readonly reset: () => void
    readonly toggleContent: () => void
    readonly toggleMarker: () => void
    readonly toggleMove: () => void
    readonly zoomIn: () => void
    readonly zoomOut: () => void
}
