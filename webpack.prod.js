const { merge } = require('webpack-merge');
const { optimize } = require('webpack');

const common = require('./webpack.common');

module.exports = merge(common, {
    mode: 'production',
    entry: {
        ...common.entry,
        'serviceworker': './serviceworker.js'
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                // Everything the first page needs from node_modules goes in ONE file. Left per package, a cold load fetched
                // about 26 vendor files plus dozens of small ones; behind a reverse proxy that limits requests per second,
                // that alone took over a minute. Packages used only by lazy pages still get their own files (see webpack.common.js).
                // Production only: in dev mode the watcher rebuilds leave the start page pointing at files that no longer exist.
                vendorInitial: {
                    test(module) {
                        return /[\\/]node_modules[\\/]/.test(module.context || '');
                    },
                    chunks: 'initial',
                    name: 'vendor',
                    priority: 20,
                    enforce: true,
                    reuseExistingChunk: true
                }
            }
        }
    },
    plugins: [
        // Small lazy chunks (under 100 KB) are joined to a neighbour: one request instead of dozens on the way to the first screen
        new optimize.MinChunkSizePlugin({ minChunkSize: 100000 })
    ]
});
