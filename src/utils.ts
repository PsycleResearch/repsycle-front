export const isTouchDevice =
    window && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
