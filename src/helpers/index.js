import React from 'react';

/**
 * Check if params has a value.
 * @param  {Any}  e Tested value
 * @return {Boolean}   True if tested value is not undefined nor null.
 */
export function hasValue(e) {
    return typeof e !== 'undefined' && e !== null;
}

/**
 * Returns value for object's path.
 * @param {Object} object
 * @param {String} keyPath
 * @returns {*}
 */
export function getValueFromPath(object, keyPath) {
    try {
        return keyPath.split('.').reduce((o, i) => o[i], object);
    } catch (error) {
        return undefined;
    }
}

/**
 * Truncate a string to desired length and ending
 * @param  {String} str
 * @param  {Object} options
 * @return {String}
 */
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
