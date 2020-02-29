import axios from 'axios';

/**
 * Returns a axios instance configured with interceptors to handle Oauth token refresh.
 * @param  {String} apiURL
 * @param  {Function} getRefreshToken
 * @param  {Function} onTokenRefreshSuccess
 * @return {Object}
 */
function getAxiosOauthInstance(apiURL, getRefreshToken, onTokenRefreshSuccess) {
    const http = axios.create({baseURL: apiURL});

    const isHandlerEnabled = (config={}) => {
        return config.hasOwnProperty('handlerEnabled') && !config.handlerEnabled ? false : true;
    };

    http.interceptors.request.use(request => {
        if (isHandlerEnabled(request.config)) {
            if (request.token) {
                request.headers['Authorization'] = 'Bearer ' + request.token;
            }
        }
        return request;
    });

    http.interceptors.response.use(null, error => {
        if (isHandlerEnabled(error.config)) {
            if (error.config && error.response && error.response.status == 401 && getRefreshToken) {
                return http({
                    method: 'post',
                    url: 'oauth/token',
                    data: {
                        grant_type: 'refresh_token',
                        refresh_token: getRefreshToken()
                    }
                }).then(response => {
                    if (response && response.data && response.data.token) {
                        error.config.headers['Authorization'] = 'Bearer ' + response.data.token;
                        onTokenRefreshSuccess && onTokenRefreshSuccess(response.data.token);
                    }
                    return http.request(error.config);
                });
            }
        }
        return Promise.reject({...error});
    });

    return http;
}

export const api = {
    getAxiosOauthInstance,
};
