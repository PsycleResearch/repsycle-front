import { DebouncedFunc, debounce, isEqual } from 'lodash'
import {
    DependencyList,
    Dispatch,
    EffectCallback,
    MutableRefObject,
    Ref,
    SetStateAction,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { getRandomId } from './helpers'

export function usePointerPosition() {
    const [position, setPosition] = useState({ clientX: 0, clientY: 0 })

    const updatePosition = (e: PointerEvent) => {
        const { clientX, clientY } = e

        setPosition({ clientX, clientY })
    }

    useAnimationFrame(() => {
        if (!window) return

        window.addEventListener('pointerenter', updatePosition, false)
        window.addEventListener('pointermove', updatePosition, false)

        return () => {
            window.removeEventListener('pointermove', updatePosition, false)
            window.removeEventListener('pointerenter', updatePosition, false)
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

export function useCombinedRefs<TRef>(
    ...refs: Array<Ref<TRef | null> | MutableRefObject<TRef | null>>
) {
    const targetRef = useRef<TRef | null>(null)

    useEffect(() => {
        refs.forEach((ref) => {
            if (!ref) return

            if (typeof ref === 'function') {
                ref(targetRef.current)
            } else {
                ;(ref as MutableRefObject<TRef | null>).current =
                    targetRef.current
            }
        })
    }, [refs])

    return targetRef
}

export function useFullScreen() {
    const [isFullScreen, setIsFullScreen] = useState(
        typeof window !== "undefined" && window.matchMedia('(display-mode: fullscreen)').matches,
    )

    const open = useCallback(() => {
        document.documentElement.requestFullscreen()
    }, [])

    const close = useCallback(() => {
        document.exitFullscreen()
    }, [])

    const handleChange = useCallback(() => {
        setIsFullScreen(
            window.matchMedia('(display-mode: fullscreen)').matches ||
                (document.fullscreenElement !== null &&
                    document.fullscreenElement !== undefined),
        )
    }, [])

    useEffect(() => {
        window.addEventListener('fullscreenchange', handleChange)

        return () => {
            window.removeEventListener('fullscreenchange', handleChange)
        }
    }, [])

    return { isFullScreen, open, close }
}

export function useLocalStorage<T>(
    key: string,
    initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
    const getValue = useCallback(
        (item: string | null) => {
            if (initialValue instanceof Map) {
                return item
                    ? (new Map<unknown, unknown>(
                          JSON.parse(item),
                      ) as unknown as T)
                    : initialValue
            }

            return item ? JSON.parse(item) : initialValue
        },
        [initialValue],
    )

    const [value, setValue] = useState<T>(() => {
        const item = localStorage.getItem(key)

        return getValue(item)
    })

    const onStorageUpdate = useCallback(
        (e: StorageEvent) => {
            if (e.key === key) {
                const newValue = getValue(e.newValue)

                if (!isEqual(newValue, value)) {
                    setValue(newValue)
                }
            }
        },
        [getValue, key, value],
    )

    useEffect(() => {
        window.addEventListener('storage', onStorageUpdate)

        return () => {
            window.removeEventListener('storage', onStorageUpdate)
        }
    }, [onStorageUpdate])

    useEffect(() => {
        if (value instanceof Map) {
            localStorage.setItem(
                key,
                JSON.stringify(Array.from(value.entries())),
            )
        } else {
            localStorage.setItem(key, JSON.stringify(value))
        }
    }, [key, value])

    return [value, setValue]
}

export function usePrevious<T>(value: T): T | undefined {
    const ref = useRef<T>()

    useEffect(() => {
        ref.current = value
    }, [value])

    return ref.current
}

export function useDebounce<T>(
    delay: number,
    initialValue?: T,
): [T | undefined, DebouncedFunc<(value: T) => void>] {
    const [debouncedValue, setDebouncedValue] = useState<T | undefined>(
        initialValue,
    )

    const debounceHandler = useMemo(
        () => debounce((value: T) => setDebouncedValue(value), delay),
        [],
    )

    useEffect(() => {
        return () => {
            debounceHandler.cancel()
        }
    }, [debounceHandler])

    return [debouncedValue, debounceHandler]
}

export function useMount(callback: EffectCallback) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(callback, [])
}

export function useUnmount(callback: EffectCallback) {
    const callbackRef = useRef(callback)

    callbackRef.current = callback

    useEffect(() => {
        return () => {
            callbackRef.current()
        }
    }, [])
}

export function useUpdateEffect(
    callback: EffectCallback,
    deps?: DependencyList,
) {
    const isFirstMount = useRef(false)

    useUnmount(() => {
        isFirstMount.current = false
    })

    useEffect(() => {
        if (isFirstMount.current) {
            return callback()
        } else {
            isFirstMount.current = true
        }
    }, deps)
}

export function useSetState<T>(
    initState: T,
): [T, Dispatch<SetStateAction<T | Partial<T>>>] {
    const [state, setState] = useState<T>(initState)

    const setMergeState = useCallback(
        (value: SetStateAction<T | Partial<T>>) => {
            setState((prevValue) => {
                const newValue =
                    typeof value === 'function'
                        ? (
                              value as (
                                  prevState: T | Partial<T>,
                              ) => T | Partial<T>
                          )(prevValue)
                        : value
                const finalValue = newValue
                    ? { ...prevValue, ...newValue }
                    : prevValue

                if (isEqual(finalValue, prevValue)) return prevValue

                return finalValue
            })
        },
        [],
    )

    return [state, setMergeState]
}

export function useKeyPress(
    targetKey: string | string[],
    handler: (event: KeyboardEvent) => void,
) {
    const handlerRef = useRef(handler)
    handlerRef.current = handler

    useEffect(() => {
        const handleDown = (event: KeyboardEvent) => {
            if (
                (Array.isArray(targetKey) && targetKey.includes(event.key)) ||
                event.key === targetKey
            ) {
                handlerRef.current.call(window, event)
            }
        }

        window.addEventListener('keydown', handleDown)

        return () => {
            window.removeEventListener('keydown', handleDown)
        }
    }, [targetKey, handler])
}

export function useId() {
    const id = useRef(getRandomId())

    return id.current
}

export function useIdOrDefault(id?: string) {
    const defaultId = useId()
    return id || defaultId
}
