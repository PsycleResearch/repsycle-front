import urlJoin from 'url-join';

import { getValueFromPath } from '../helpers';

function getAPITypes(type) {
    return {
        'FETCHING': type + '_FETCHING',
        'SUCCESS': type + '_SUCCESS',
        'FAILED': type + '_FAILED'
    };
}

function makeAction(type, ...argNames) {
    return (...args) => {
        const action = { type };
        
        argNames.forEach((arg, index) => {
            action[argNames[index]] = args[index]
        });

        return action;
    };
}

/**
 * Creates an API action.
 * @param  {String} type                Root type of the action.
 * @param  {String} method              HTTP Method (post, get, ...)
 * @param  {String} endpoint            API endpoint (after base url, see api.js)
 * @param  {Function} callbackSuccess   Optional callback on successfull call
 * @param  {Function} callbackFailed    Optional callback on failed call
 * @return {Function}                   Generated action
 */
function makeApiAction(http) {
    return {
        makeApiAction: (obj = {type: null, method: 'get', endpoint: ''}) => {
            const { FETCHING, SUCCESS, FAILED } = getAPITypes(obj.type);

            return function action(args = {
                params: null, 
                data: null, 
                success: null, 
                failed: null
            }) {
                return (dispatch) => {
                    dispatch({type: FETCHING});

                    const request = {
                        ...obj,
                        ...args,
                        endpoint: args.endpoint ? urlJoin(obj.endpoint, args.endpoint) : obj.endpoint
                    };

                    http(request).then((response) => {
                        let payload = response.data;
                        if (obj.method === 'destroy') {
                            payload = [];
                        }
                        
                        dispatch({type: SUCCESS, payload});

                        if (args.success) {
                            args.success(response);
                        }
                    }).catch((error) => {
                        const msg = getValueFromPath(error, 'response.data.error') || '';

                        dispatch({type: FAILED, payload: msg});

                        if (args.failed) {
                            args.failed(error);
                        }
                    });
                };
            }
        },

    };
}

function makeCrudAction(type, endpoint='') {    
    return {
        create: makeApiAction({
            type: type + '_CREATE', 
            method: 'post', 
            endpoint: endpoint, 
        }),
        read: makeApiAction({
            type: type + '_READ', 
            method: 'get', 
            endpoint: endpoint, 
        }),
        update: makeApiAction({
            type: type + '_UPDATE', 
            method: 'put', 
            endpoint: endpoint, 
        }),
        delete: makeApiAction({
            type: type + '_DELETE', 
            method: 'destroy', 
            endpoint: endpoint, 
        }),
        all: makeApiAction({
            type: type + 'S',
            method: 'get',
            endpoint: endpoint,
        }),
        reset: makeAction(type + '_RESET')
    };
}

export const types = {
    getAPITypes,
    AUTH_LOGIN: 'authLogin',
    AUTH_LOGOUT: 'authLogout',
    LANG_CHANGED: 'langChanged',
    TOASTER_ADDED: 'toasterAdded',
    TOASTER_REMOVED: 'toasterRemoved',
};

export const actions = {
    makeAction,
    makeApiAction,
    makeCrudAction,
};
