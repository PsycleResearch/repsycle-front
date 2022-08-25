import { noop } from 'lodash'
import { createContext } from 'react'
import { DRAW_ZONE_2_INITIAL_STATE } from './constants'
import { DrawZone2StateContext } from './types'

export const DrawZone2Context = createContext<DrawZone2StateContext>({
    state: { ...DRAW_ZONE_2_INITIAL_STATE },
    setState: noop,
})
