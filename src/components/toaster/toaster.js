import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class Toaster extends Component {
    constructor(props) {
        super(props);

        this.state = {
            in: false,
        };
    }

    componentDidMount() {
        const { stay, index } = this.props;
        this.setState({in: true});
        
        if (!stay) {  
            this[`timeout${index}`] = setTimeout(() => (this.setState({in: false})), 4000); 
        }
    }

    componentWillUnmount() {
        const { onRemove, index } = this.state;
        onRemove(index);
    }

    render() {
        const { type, message } = this.props;

        return (
            <CSSTransition
                in={this.state.in}
                timeout={500}
                classNames="toaster-animation"
                unmountOnExit
            >
                <div className={`toaster px-3 py-2 ${type}`}>
                    <div className="icon">
                    </div>
                    <div className="message">
                        <div className="title mb-1">
                            {type === 'info' && <FormattedMessage id="Info" />}
                            {type === 'success' && <FormattedMessage id="Succès" />}
                            {type === 'error' && <FormattedMessage id="Erreur" />}
                        </div>
                        
                        {message}
                    </div>
                    <div className="close">
                        <button
                            type="button" 
                            className="close ml-3" 
                            onClick={() => this.setState({in: false})}>
                            &times;
                        </button>
                    </div>
                </div>
            </CSSTransition>
        );
    }
}

Toaster.propTypes = {
    type: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired
};
