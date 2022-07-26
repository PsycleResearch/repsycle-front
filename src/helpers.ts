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

export function getRandomId() {
    const arr = new Uint32Array(1)
    global.crypto.getRandomValues(arr)
    return arr[0].toString(36)
}

export function getRandomNumber(min: number, max: number) {
    const arr = new Uint32Array(1)
    global.crypto.getRandomValues(arr)
    const random = arr[0]
    const range = max - min
    return Math.floor((random / (0xffffffff + 1)) * range + min)
}

export function groupBy<T extends Record<string | number, string | number>>(
    arr: T[],
    key: string | number,
) {
    return arr.reduce((acc, cur) => {
        const value = acc.get(cur[key])

        if (!value) {
            acc.set(cur[key], [cur])
        } else {
            acc.set(cur[key], [...value, cur])
        }

        return acc
    }, new Map<string | number, Array<T>>())
}

export function isReactMouseEvent<TElement = Element>(
    event: React.SyntheticEvent<TElement, MouseEvent | KeyboardEvent>,
): event is React.SyntheticEvent<TElement, MouseEvent> {
    return event.nativeEvent instanceof MouseEvent
}

export function isReactKeyboardEvent<TElement = Element>(
    event: React.SyntheticEvent<TElement, MouseEvent | KeyboardEvent>,
): event is React.SyntheticEvent<TElement, KeyboardEvent> {
    return event.nativeEvent instanceof KeyboardEvent
}

export function numberToHex(number: number): string {
    const hex = number.toString(16)
    return hex.length === 1 ? `0${hex}` : hex
}

export function bgrToHex(b: number, g: number, r: number) {
    return `#${numberToHex(r)}${numberToHex(g)}${numberToHex(b)}`
}

export function hexToBgr(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
        ? [
              parseInt(result[3], 16),
              parseInt(result[2], 16),
              parseInt(result[1], 16),
          ]
        : null
}

export async function copyToClipboard(text: string) {
    if (!navigator.clipboard) {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.top = '0'
        textarea.style.left = '0'
        document.body.appendChild(textarea)

        textarea.focus()
        textarea.select()

        try {
            const success = document.execCommand('copy')

            if (!success) {
                throw new Error('unable to copy')
            }
        } finally {
            document.body.removeChild(textarea)
        }

        return
    }

    return await navigator.clipboard.writeText(text)
}

const ipv4Regex = new RegExp(
    '^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$',
)
export function isIPV4(ip: string) {
    return ipv4Regex.test(ip)
}

export function downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

export function isNumberKeyEvent(event: KeyboardEvent): number | false {
    const key = event.key

    const number = parseInt(key, 10)
    if (number >= 0 && number <= 9) {
        return number
    }

    return false
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}
