import DrawZone2, { DrawZone2Editor } from './components'
import {} from './types'
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
import { useControls, useDrawZone2, useLoadImage } from './hooks'

export default DrawZone2
export { DrawZone2, DrawZone2Editor, useControls, useDrawZone2, useLoadImage }
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
