import React from 'react';
import PropTypes from 'prop-types';

import { Route } from 'react-router-dom';

RestrictedRoute.propTypes = {
    user: PropTypes.object.isRequired,
    render: PropTypes.func,
    roles: PropTypes.arrayOf(PropTypes.string),
    permissions: PropTypes.arrayOf(PropTypes.string)
};

export function RestrictedRoute({
    user,
    component: Component, 
    render, 
    roles, 
    permissions, 
    ...rest
}) {
    let redirect = null;

    if (user === null) {
        redirect = `/login?next=${window.location.pathname.substr(1) || '/'}`;
    }

    if (user && roles && (roles.indexOf(user.role) === -1)) {
        redirect = '/?_tc=403';
    }

    // If not one of the user's permission is in the permissions array
    if (
        user &&        
        permissions && 
        user.permissions && 
        !user.permissions.some(p => permissions.indexOf(p) !== -1)
    ) {
        redirect = '/?_tc=403';
    }

    if (redirect) {
        window.location.replace(redirect);
        return null;
    }

    if (render) {
        return <Route {...rest} render={render} />;
    }

    return <Route {...rest} render={(props) => <Component { ...props} />} />;
};

RestrictedRoute.displayName = 'RestrictedRoute';
