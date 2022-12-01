import { Dispatch, SetStateAction } from 'react'
import { BGR } from '../types'

export type DrawZoneMode = 'draw' | 'none'
export type DrawZoneShape = 'rect' | 'poly' | 'none'
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

export type DrawZoneState = {
    readonly contentHidden: boolean
    readonly logicalScale: number
    readonly markerVisible: boolean
    readonly move: boolean
    readonly positionTop: number
    readonly positionLeft: number
    readonly scale: number
}
export type DrawZoneStateContext = {
    readonly state: DrawZoneState
    readonly setState: Dispatch<
        SetStateAction<DrawZoneState | Partial<DrawZoneState>>
    >
}

export enum PictureLoadingState {
    Idle,
    Loading,
    Error,
    Done,
}
