import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import { useMutation } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import { ServerConnections } from 'lib/khylo-apiclient';
import axios from 'axios';

const useShutdownServer = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async () => {
            const legacyClient = ServerConnections.currentApiClient();
            if (legacyClient && typeof (legacyClient as any).shutdownServer === 'function') {
                try {
                    await (legacyClient as any).shutdownServer();
                    return;
                } catch (e) {
                    console.warn('[useShutdownServer] legacy shutdownServer failed:', e);
                }
            }

            if (api) {
                try {
                    return await getSystemApi(api).shutdownApplication();
                } catch (e) {
                    console.warn('[useShutdownServer] SDK shutdownApplication failed:', e);
                }
            }

            const baseUrl = api?.basePath || (legacyClient?.serverAddress ? legacyClient.serverAddress() : '');
            const token = api?.accessToken || (legacyClient?.accessToken ? legacyClient.accessToken() : '');
            const url = `${baseUrl.replace(/\/+$/, '')}/System/Shutdown`;
            return await axios.post(url, null, {
                headers: {
                    Authorization: `MediaBrowser Token="${token}"`
                }
            });
        }
    });
};

export default useShutdownServer;
