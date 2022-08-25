import { Dispatch, SetStateAction } from 'react'
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
    readonly contentHidden: boolean
    readonly logicalScale: number
    readonly markerVisible: boolean
    readonly move: boolean
    readonly positionTop: number
    readonly positionLeft: number
    readonly scale: number
}
export type DrawZone2StateContext = {
    readonly state: DrawZone2State
    readonly setState: Dispatch<
        SetStateAction<DrawZone2State | Partial<DrawZone2State>>
    >
}

export enum PictureLoadingState {
    Idle,
    Loading,
    Error,
    Done,
}
