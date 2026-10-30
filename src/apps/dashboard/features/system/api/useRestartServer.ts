import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import { useMutation } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import { ServerConnections } from 'lib/khylo-apiclient';
import axios from 'axios';

const useRestartServer = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async () => {
            const legacyClient = ServerConnections.currentApiClient();
            if (legacyClient && typeof (legacyClient as any).restartServer === 'function') {
                try {
                    await (legacyClient as any).restartServer();
                    return;
                } catch (e) {
                    console.warn('[useRestartServer] legacy restartServer failed:', e);
                }
            }

            if (api) {
                try {
                    return await getSystemApi(api).restartApplication();
                } catch (e) {
                    console.warn('[useRestartServer] SDK restartApplication failed:', e);
                }
            }

            const baseUrl = api?.basePath || (legacyClient?.serverAddress ? legacyClient.serverAddress() : '');
            const token = api?.accessToken || (legacyClient?.accessToken ? legacyClient.accessToken() : '');
            const url = `${baseUrl.replace(/\/+$/, '')}/System/Restart`;
            return await axios.post(url, null, {
                headers: {
                    Authorization: `MediaBrowser Token="${token}"`
                }
            });
        }
    });
};

export default useRestartServer;
