import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';

import { getLiveChannelsEnabled } from './liveChannelsApi';

export const LIVE_CHANNELS_STATUS_QUERY_KEY = 'KhyloLiveChannelsStatus';

/** Whether Live Channels is turned on; undefined while loading. Assumes on if the server can't say. */
export const useLiveChannelsEnabled = () => {
    const { api, user } = useApi();
    const { data } = useQuery({
        queryKey: [ LIVE_CHANNELS_STATUS_QUERY_KEY ],
        queryFn: async () => {
            try {
                return await getLiveChannelsEnabled(api!);
            } catch {
                return true;
            }
        },
        enabled: Boolean(api && user?.Id),
        staleTime: 5 * 60_000
    });
    return data;
};
