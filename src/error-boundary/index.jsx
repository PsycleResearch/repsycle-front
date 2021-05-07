import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { truncate } from '../helpers';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);

        this.state = {
            hasError: false,
            error: null,
            more: false,
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error) {
        this.setState({ error });
    }

    render() {
        const { title, hasError, error, more } = this.state;

        if (hasError) {
            return (
                <div className="error-boundary">
                    <div className="error__content">
                        <h5 className="mb-2">
                            {title}
                        </h5>
                        <span className="d-block mb-4">
                            {translate("Une erreur est survenue.")}
                        </span>
                        {error && (
                            <div className="text-muted text--small">
                                <b>{error.name}</b> : {error.message} 
                                <br /><br />
                                <code>
                                    {truncate(error.stack, {length: more 
                                        ? error.stack.length 
                                        : 128
                                    })}
                                </code>&nbsp;&nbsp;
                                <button className="btn btn-more" onClick={() => this.setState({more: !more})}>
                                    {more ? "Moins" : "Plus"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

ErrorBoundary.propTypes = {
};
