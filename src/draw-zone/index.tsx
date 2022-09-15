import DrawZone, { DrawZoneContainer } from './components'
import type {
    DrawZoneElement,
    DrawZoneFitMode,
    DrawZoneMode,
    DrawZoneShape,
    DrawZoneState,
    PictureLoadingState,
    Point,
    Rect,
    Size,
} from './types'
import { useControls, useLoadImage } from './hooks'

export default DrawZone
export {
    DrawZoneContainer as DrawZoneContainer,
    DrawZone,
    useControls,
    useLoadImage,
}
export type {
    DrawZoneElement,
    DrawZoneFitMode,
    DrawZoneMode,
    DrawZoneShape,
    DrawZoneState,
    PictureLoadingState,
    Point,
    Rect,
    Size,
}
