import React from 'react';
import formatDateFns from 'date-fns/format';
import parseJSON from 'date-fns/parseJSON';

export function uuid4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function hasValue(e) {
    return typeof e !== 'undefined' && e !== null;
}

export function getValueFromPath(object, keyPath) {
    try {
        return keyPath.split('.').reduce((o, i) => o[i], object);
    } catch (error) {
        return undefined;
    }
}

export function truncate(str, options = {length: null, ending: null}) {
    let length = options.length || 10;
    let ending = options.ending || "...";

    if (str.length > length) {
        return str.substring(0, length - ending.length) + ending;
    } else {
        return str;
    }
}

export function makeState(initialState, reducer, actions) {
    return {
        initialState,
        context: React.createContext(initialState),
        reducer,
        actions: actions.reduce((acc, type) => ({
            ...acc,
            [type]: (d, payload) => d({type, payload})
        }), [])
    }
}

export function formatDate(date, format) {
    return formatDateFns(parseJSON(date), format);
}

export function formatBase64(base64, options = { removeHeader: false, contentType: "image/png" }) {
    if (/^(data:.*;base64,)/.test(base64)) {
        if (options.removeHeader) {
            return base64.split(',')[1];
        } else {
            return base64;
        }
    } else if (options.removeHeader) {
        return base64;
    } else {
        return `data:${options.contentType};base64, ${base64}`;
    }
}
