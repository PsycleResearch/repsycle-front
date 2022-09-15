import { noop } from 'lodash'
import { createContext } from 'react'
import { DRAW_ZONE_INITIAL_STATE } from './constants'
import { DrawZoneStateContext } from './types'

export const DrawZoneContext = createContext<DrawZoneStateContext>({
    state: { ...DRAW_ZONE_INITIAL_STATE },
    setState: noop,
})
