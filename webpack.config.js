const path = require('path');
const webpack = require('webpack');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');

// globals
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEV_PORT = process.env.PORT || 9000;

module.exports = {
    mode: IS_PRODUCTION ? "production" : "development",

    watch: IS_PRODUCTION ? false : true,
    
    entry: "./src/index.js",

    output: {
        path: path.resolve(__dirname, "./dist"),
        filename: "repsycle.js",
        library: "Repsycle",
        libraryTarget: "umd"
    },

    devtool: IS_PRODUCTION ? false : "inline-source-map",

    module: {
        rules: [
            {
                test: /\.js$/,
                loader: require.resolve("babel-loader"),
                options: {
                    presets: ["@babel/env", "@babel/react"],
                },
                exclude: /node_modules/,
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: require.resolve("css-loader"),
                        options: {
                            importLoaders: 1,
                        }
                    },
                    {
                        loader: require.resolve("postcss-loader"),
                        options: {
                            plugins: [
                                require("autoprefixer"),
                                require("cssnano")({preset: "default"}),
                            ],
                        },
                    },
                    require.resolve("sass-loader"),
                ],
            },
        ],
    },

    plugins: [
        new MiniCssExtractPlugin({filename: "repsycle.css"}),
    ],
};
