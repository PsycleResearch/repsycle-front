export function uuid4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g,
        function (c) {
            const r = (Math.random() * 16) | 0
            const v = c == 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
        },
    )
}

export function hasValue(e: unknown): boolean {
    return e !== undefined && e !== null
}

interface TruncateOptions {
    length?: number | null
    ending?: string | null
}
export function truncate(
    str: string,
    options: TruncateOptions = { length: null, ending: null },
): string {
    const length = options.length || 10
    const ending = options.ending || '...'

    if (str.length > length) {
        return str.substring(0, length - ending.length) + ending
    } else {
        return str
    }
}
