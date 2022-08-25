import DrawZone2, { DrawZone2Container } from './components'
import type {
    DrawZone2Mode,
    DrawZone2Shape,
    DrawZone2State,
    DrawZoneElement,
    DrawZoneFitMode,
    Point,
    Rect,
    Size,
} from './types'
import { useControls, useLoadImage } from './hooks'

export default DrawZone2
export { DrawZone2Container, DrawZone2, useControls, useLoadImage }
export type {
    Point,
    Rect,
    Size,
    DrawZoneElement,
    DrawZone2State,
    DrawZone2Mode,
    DrawZone2Shape,
    DrawZoneFitMode,
}
