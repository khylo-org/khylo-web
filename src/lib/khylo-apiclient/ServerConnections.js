import { Credentials } from 'khylo-apiclient';

import { appHost } from 'components/apphost';
import appSettings from 'scripts/settings/appSettings';
import { setUserInfo } from 'scripts/settings/userSettings';
import { detectBitrate } from 'utils/bitrateTest';
import Dashboard from 'utils/dashboard';
import Events from 'utils/events';
import { createApiClient } from 'utils/khylo-apiclient/createApiClient';

import ConnectionManager from './connectionManager';

const normalizeImageOptions = options => {
    if (!options.quality && (options.maxWidth || options.width || options.maxHeight || options.height || options.fillWidth || options.fillHeight)) {
        options.quality = 90;
    }
};

const getMaxBandwidth = () => {
    if (navigator.connection) {
        let max = navigator.connection.downlinkMax;
        if (max && max > 0 && max < Number.POSITIVE_INFINITY) {
            max /= 8;
            max *= 1000000;
            max *= 0.7;
            return parseInt(max, 10);
        }
    }

    return null;
};

class ServerConnections extends ConnectionManager {
    firstConnection = false;

    constructor() {
        super(...arguments);
        this.localApiClient = null;
        this.firstConnection = null;

        Events.on(this, 'localusersignedout', (_e, logoutInfo) => {
            setUserInfo(null, null);
            // Ensure the updated credentials are persisted to storage
            credentialProvider.credentials(credentialProvider.credentials());

            if (window.NativeShell && typeof window.NativeShell.onLocalUserSignedOut === 'function') {
                window.NativeShell.onLocalUserSignedOut(logoutInfo);
            }
        });

        Events.on(this, 'apiclientcreated', (_e, apiClient) => {
            apiClient.getMaxBandwidth = getMaxBandwidth;
            apiClient.normalizeImageOptions = normalizeImageOptions;

            // Calling getApi will ensure apiClient._sdk is initialized.
            this.getApi(apiClient.serverId());
            apiClient.subscribe = apiClient._sdk.subscribe.bind(apiClient._sdk);
        });

        Events.on(this, 'connected', (_e, result) => {
            if (result && result.ApiClient) {
                this.setLocalApiClient(result.ApiClient);
            }
        });
    }

    initApiClient(server) {
        console.debug('creating ApiClient singleton');

        const apiClient = createApiClient(
            server,
            appHost.appName(),
            appHost.appVersion(),
            appHost.deviceName(),
            appHost.deviceId()
        );

        apiClient.enableAutomaticNetworking = false;
        apiClient.manualAddressOnly = true;

        this.addApiClient(apiClient);

        this.setLocalApiClient(apiClient);

        console.debug('loaded ApiClient singleton');
    }

    /**
     * @returns {Promise<import('khylo-apiclient').ConnectResponse>} The result of the connection attempt.
     */
    async connect(options) {
        const connectOptions = {
            enableAutoLogin: appSettings.enableAutoLogin(),
            ...options
        };
        const result = await super.connect(connectOptions);

        // A browser that has never been here has no saved server, so the usual check ends at "pick a server".
        // But this page was served by a Khylo server, and that server is the one to use: connect to it, so a new
        // install goes straight to first-time setup and a new browser straight to sign in.
        if (result?.State === 'ServerSelection' && !result.Servers?.length && this.localApiClient) {
            try {
                const local = await this.connectToAddress(this.localApiClient.serverAddress(), connectOptions);
                if (local && local.State !== 'Unavailable') return local;
            } catch (err) {
                console.debug('[ServerConnections] could not reach the server this page came from', err);
            }
        }

        return result;
    }

    setLocalApiClient(apiClient) {
        if (apiClient) {
            this.localApiClient = apiClient;
            window.ApiClient = apiClient;
            // Calling getApi will ensure apiClient._sdk is initialized.
            this.getApi(apiClient.serverId());
        }
    }

    getLocalApiClient() {
        return this.localApiClient;
    }

    /**
     * Gets the ApiClient that is currently connected.
     * @returns {import('khylo-apiclient').ApiClient|undefined} apiClient
     */
    currentApiClient() {
        let apiClient = this.getLocalApiClient();

        if (!apiClient) {
            const server = this.getLastUsedServer();

            if (server) {
                apiClient = this.getApiClient(server.Id);
            }
        }

        if (!apiClient && this._apiClients.length > 0) {
            apiClient = this._apiClients[0];
        }

        return apiClient;
    }

    /**
     * Gets the ApiClient that is currently connected or throws if not defined.
     * @async
     * @returns {Promise<ApiClient>} The current ApiClient instance.
     */
    async getCurrentApiClientAsync() {
        const apiClient = this.currentApiClient();
        if (!apiClient) throw new Error('[ServerConnection] No current ApiClient instance');

        return apiClient;
    }

    onLocalUserSignedIn(user) {
        const apiClient = this.getApiClient(user.ServerId);
        this.setLocalApiClient(apiClient);
        setTimeout(() => detectBitrate(this.getApi(user.ServerId), true), 6000);
        return setUserInfo(user.Id, apiClient).then(() => {
            if (window.NativeShell && typeof window.NativeShell.onLocalUserSignedIn === 'function') {
                return window.NativeShell.onLocalUserSignedIn(user, apiClient.accessToken());
            }
            return Promise.resolve();
        });
    }
}

const CREDENTIALS_KEY = 'khylo_credentials';

const credentialProvider = new Credentials(CREDENTIALS_KEY);

const capabilities = Dashboard.capabilities(appHost);

export default new ServerConnections(
    credentialProvider,
    () => appHost.appName(),
    () => appHost.appVersion(),
    () => appHost.deviceName(),
    () => appHost.deviceId(),
    capabilities);
