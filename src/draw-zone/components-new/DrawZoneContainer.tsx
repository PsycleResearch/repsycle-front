import React, { PropsWithChildren } from 'react'
import { useSetState } from '../../hooks'
import { DRAW_ZONE_INITIAL_STATE } from '../constants'
import { DrawZoneContext } from '../state'
import { DrawZoneState } from '../types'

export default function DrawZoneContainer({
    children,
}: PropsWithChildren<unknown>) {
    const [state, setState] = useSetState<DrawZoneState>({
        ...DRAW_ZONE_INITIAL_STATE,
    })

    return (
        <DrawZoneContext.Provider value={{ state, setState }}>
            {children}
        </DrawZoneContext.Provider>
    )
}
