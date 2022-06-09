export const isTouchDevice =
    global.window &&
    ('ontouchstart' in global.window || navigator.maxTouchPoints > 0)
