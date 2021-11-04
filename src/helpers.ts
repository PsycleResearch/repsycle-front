import React from 'react'
import formatDateFns from 'date-fns/format'
import parseJSON from 'date-fns/parseJSON'

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

export function hasValue(e: any): boolean {
    return typeof e !== 'undefined' && e !== null
}

export function getValueFromPath(object: any, keyPath: string): any {
    try {
        return keyPath.split('.').reduce((o: any, i: string) => o[i], object)
    } catch (error) {
        return undefined
    }
}

interface TruncateOptions {
    length?: number | null
    ending?: string | null
}
export function truncate(
    str: string,
    options: TruncateOptions = { length: null, ending: null },
): string {
    let length = options.length || 10
    let ending = options.ending || '...'

    if (str.length > length) {
        return str.substring(0, length - ending.length) + ending
    } else {
        return str
    }
}

export function makeState(
    initialState: object,
    reducer: (state: object, action: any) => object,
    actions: string[],
): object {
    return {
        initialState,
        context: React.createContext(initialState),
        reducer,
    }
}

export function formatDate(date: Date, format: string): string {
    return formatDateFns(parseJSON(date), format)
}

interface FormatBase64Options {
    removeHeader?: boolean
    contentType?: string
}
export function formatBase64(
    base64: string,
    options: FormatBase64Options = {
        removeHeader: false,
        contentType: 'image/png',
    },
): string {
    if (/^(data:.*;base64,)/.test(base64)) {
        if (options.removeHeader) {
            return base64.split(',')[1]
        } else {
            return base64
        }
    } else if (options.removeHeader) {
        return base64
    } else {
        return `data:${options.contentType};base64, ${base64}`
    }
}
