const { merge } = require('webpack-merge');

const common = require('./webpack.common');

// The Khylo server the dev server forwards API calls to, so the app works from any address that
// reaches the dev server (LAN IP, a domain behind a reverse proxy, ...) without picking a server
const KHYLO_SERVER_URL = process.env.KHYLO_SERVER_URL || 'http://localhost:8096';

// Folders the web app itself serves; everything else without a file extension is the server's
const WEB_APP_FOLDERS = [ 'assets', 'favicons', 'libraries', 'themes' ];
// The dev server's own live-reload socket
const DEV_SERVER_PATHS = [ 'ws' ];

/**
 * Whether a request is for the server rather than the web app. Web app files have an extension
 * (main.bundle.js, config.json, ...) or live in a few known folders; the server's routes don't,
 * and the app calls them in either case (/Items, /users/public, /videos/{id}/master.m3u8, ...).
 */
const isServerRequest = (pathname) => {
    if (pathname.toLowerCase().startsWith('/web/configurationpage')) return true;

    const firstSegment = pathname.split('/')[1] || '';
    return firstSegment !== ''
        && !firstSegment.includes('.')
        && !firstSegment.startsWith('__')
        && !WEB_APP_FOLDERS.includes(firstSegment)
        && !DEV_SERVER_PATHS.includes(firstSegment)
        && firstSegment !== 'web';
};

module.exports = merge(common, {
    // In order for live reload to work we must use "web" as the target not "browserslist"
    target: process.env.WEBPACK_SERVE ? 'web' : 'browserslist',
    mode: 'development',
    devtool: 'eval-cheap-module-source-map',
    module: {
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                enforce: 'pre',
                use: ['source-map-loader']
            }
        ]
    },
    devServer: {
        host: '0.0.0.0',
        allowedHosts: 'all',
        port: 8081,
        compress: true,
        devMiddleware: {
            writeToDisk: true
        },
        client: {
            overlay: false
        },
        proxy: [
            {
                context: isServerRequest,
                target: KHYLO_SERVER_URL,
                ws: true,
                xfwd: true
            }
        ]
    }
});
