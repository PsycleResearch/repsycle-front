const path = require('path');

module.exports = (env, args) => {
    const config = {
        entry: './src/index.js',
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /nodeModules/,
                    use: {
                        loader: 'babel-loader'
                    }
                }
            ]
        },
        resolve: {
            extensions: ['.js', '.jsx']
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'repsycle.min.js',
            library: {
                name: 'Repsycle',
                type: 'umd'
            }
        },
        externals: ['react', 'react-dom', 'react-router', 'react-router-dom']
    };

    if (args.mode === "development") {
        config.watch = true;
        config.devtool = "source-map"
    }

    return config
};
