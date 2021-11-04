import { useEffect, useRef, useState } from 'react'

export function useMousePosition() {
    const [position, setPosition] = useState({ clientX: 0, clientY: 0 })

    const updatePosition = (e: MouseEvent) => {
        const { clientX, clientY } = e

        setPosition({ clientX, clientY })
    }

    useAnimationFrame(() => {
        window.addEventListener('mousemove', updatePosition, false)
        window.addEventListener('mouseenter', updatePosition, false)

        return () => {
            window.removeEventListener('mousemove', updatePosition)
            window.removeEventListener('mouseenter', updatePosition)
        }
    })

    return position
}

export function useAnimationFrame(callback: Function) {
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
