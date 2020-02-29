import { types } from '../actions';

function makeReducer(initialState, handlers) {
    return (state = initialState, action) => {
        if (handlers.hasOwnProperty(action.type)) {
            return handlers[action.type](state, action)
        } else {
            return state;
        }
    };
}

const apiInitalState = { error: null, data: null };

function apiHandlers(type) {
    return {
        [type + '_SUCCESS']: (state, action) => {
            return {error: null, data: action.payload};
        },
        [type + '_FAILED']: (state, action) => {
            return {error: action.payload, data: null};
        }
    }
}

function makeApiReducer(type, initialState = apiInitalState, handlers = null) {
    return makeReducer(initialState, {
        ...apiHandlers(type),
        ...handlers
    });
}

function makeCrudReducer(type, initialState = apiInitalState, handlers = null) {
    return makeReducer(initialState, {
        ...apiHandlers(type + '_CREATE'),
        ...apiHandlers(type + '_READ'),
        ...apiHandlers(type + '_UPDATE'),
        ...apiHandlers(type + '_DELETE'),
        [type + '_RESET']: (state, action) => {
            return {...apiInitalState};
        },
        ...handlers
    });
}

function makeAuthReducer(appName = "psycle") {
    return makeApiReducer('AUTH', apiInitalState, {
        ['AUTH_LOGIN_SUCCESS']: (state, action) => {
            return state;
        }
    });
}

function makeLocaleReducer(messages) {
    return makeReducer(
        {
            language: "fr",
            messages: {}
        }, 
        {
            [types.LANG_CHANGED]: (state, action) => {
                return state;
            }
        }
    );
}

function makeToasterReducer() {
    return makeReducer(
        [],
        {
            [types.TOASTER_ADDED]: (state, action) => {
                let toasters = [...state];
                toasters.push(action.payload);
                return toasters;
            },
            [types.TOASTER_REMOVED]: (state, action) => {
                toasters = [...state];
                if (action.payload) {
                    toasters.splice(action.payload, 1);
                } else {
                    toasters.splice(-1, 1);
                }
                return toasters;
            }
        }
    );
}

export const reducers = {
    makeReducer,
    apiInitalState,
    apiHandlers,
    makeApiReducer,
    makeCrudReducer,
    makeAuthReducer,
    makeLocaleReducer,
    makeToasterReducer
};
