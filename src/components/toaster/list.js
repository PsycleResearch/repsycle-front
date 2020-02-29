import React from 'react';
import PropTypes from 'prop-types';

export function ToasterList({toasters, }) {
    return (
        <div className="toasters">
            {toasters.map((toaster, index) => (
                <Toaster
                    key={index}
                    index={index}
                    type={toaster.type}
                    message={toaster.message}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
};

ToasterList.displayName = 'ToasterList';

ToasterList.propTypes = {
    toasters: PropTypes.arrayOf(PropTypes.object).isRequired
};
