const webpack = require('webpack');

module.exports = {
    entry: './dist/snackabra.js', // the entry point of your application
    mode: 'production',
    // watch: true,
    optimization: {
        minimize: true
    },
    output: {
        library: 'SB', // the name exported to window
        libraryTarget: 'umd',
        filename: './dist/snackabra.min.js',
        path: __dirname
    },
    plugins: [
        new webpack.DefinePlugin({
            DBG: JSON.stringify(false),
            DBG2: JSON.stringify(false),
        }),
    ],
};
