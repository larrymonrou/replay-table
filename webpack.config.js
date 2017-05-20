const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const UnminifiedWebpackPlugin = require('unminified-webpack-plugin');

const config = {
    entry: './src/replay-table.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: '',
        filename: 'replay-table.min.js',
        library: 'replayTable',
        libraryTarget: 'umd'
    },
    module: {
        rules: [
            {test: /\.(js|jsx)$/, exclude: /node_modules/, use: 'babel-loader'},
            {test: /\.css$/, use: ExtractTextPlugin.extract({fallback: 'style-loader', use: 'css-loader'})}
        ]
    },
    externals: {
        d3: {
            commonjs: 'd3',
            commonjs2: 'd3',
            amd: 'd3',
            root: 'd3'
        }
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin(),
        new HtmlWebpackPlugin({
            template: 'index.html',
            inject: 'head'
        }),
        new ExtractTextPlugin("replay-table.css"),
        new webpack.DefinePlugin({'process.env': {NODE_ENV: JSON.stringify('production')}}),
        new UnminifiedWebpackPlugin()
    ]
};

module.exports = config;
