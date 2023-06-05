module.exports = {
    entry: './dist/src/snackabra.js', // the entry point of your application
    mode: 'production',
    watch: true,
    optimization: {
        minimize: true
    },
    output: {
        library: 'SB', // the name exported to window
        libraryTarget: 'umd',
        filename: './dist/snackabra.min.js',
        path: __dirname
    }
};
