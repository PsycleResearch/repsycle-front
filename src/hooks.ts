import { useEffect, useRef, useState } from 'react'

export function usePointerPosition() {
    const [position, setPosition] = useState({ clientX: 0, clientY: 0 })

    const updatePosition = (e: PointerEvent) => {
        const { clientX, clientY } = e

        setPosition({ clientX, clientY })
    }

    useAnimationFrame(() => {
        if (!global.window) return

        global.window.addEventListener('pointerenter', updatePosition, false)
        global.window.addEventListener('pointermove', updatePosition, false)

        return () => {
            global.window.removeEventListener(
                'pointermove',
                updatePosition,
                false,
            )
            global.window.removeEventListener(
                'pointerenter',
                updatePosition,
                false,
            )
        }
    })

    return position
}

export function useAnimationFrame(callback: CallableFunction) {
    // Use useRef for mutable variables that we want to persist
    // without triggering a re-render on their change
    const requestRef = useRef<number>()
    const previousTimeRef = useRef<number>()

    const animate = (time: number) => {
        if (previousTimeRef.current != undefined) {
            const deltaTime = time - previousTimeRef.current
            callback(deltaTime)
        }
        previousTimeRef.current = time
        requestRef.current = requestAnimationFrame(animate)
    }

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate)

        return () => {
            requestRef.current && cancelAnimationFrame(requestRef.current)
        }
    }, [])
}
