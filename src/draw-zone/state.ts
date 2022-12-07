import { createContext } from 'react'
import { DrawZoneStateContext } from './types'

export const DrawZoneContext = createContext<DrawZoneStateContext | null>(null)
