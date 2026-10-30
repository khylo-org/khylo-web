import type { Api } from '@khylo/sdk';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';
import { LIVE_CHANNELS_STATUS_QUERY_KEY } from 'components/khylo/live/useLiveChannelsEnabled';

export type LiveChannelAdminState = 'OnAir' | 'Off' | 'NotEnoughContent' | 'OutOfSeason';

export interface LiveChannelAdminChannel {
    Id: string;
    Key?: string | null;
    Number: number;
    Name: string;
    /** TV, Movies, Seasonal, Networks or Collections. */
    Group: string;
    Description: string;
    Enabled: boolean;
    State: LiveChannelAdminState;
    TitleCount: number;
    MinimumTitles: number;
    Hours: number;
    MinimumHours: number;
    ActiveMonths: number[];
}

export interface LiveChannelsAdmin {
    Enabled: boolean;
    Channels: LiveChannelAdminChannel[];
}

export const QUERY_KEY = 'LiveChannelsAdmin';

const headers = (api: Api) => ({ Authorization: api.authorizationHeader });

const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [ QUERY_KEY ] });
    void queryClient.invalidateQueries({ queryKey: [ LIVE_CHANNELS_STATUS_QUERY_KEY ] });
    // The guide changes with the lineup
    void queryClient.invalidateQueries({ queryKey: [ 'KhyloLiveGuide' ] });
};

export const useLiveChannelsAdmin = () => {
    const { api } = useApi();
    return useQuery({
        queryKey: [ QUERY_KEY ],
        queryFn: async ({ signal }) => {
            const response = await api!.axiosInstance.get<LiveChannelsAdmin>(`${api!.basePath}/LiveChannels/Admin`, {
                headers: headers(api!),
                signal
            });
            return response.data;
        },
        enabled: Boolean(api)
    });
};

/** Turns Live Channels on or off for the whole server. */
export const useSetLiveChannelsEnabled = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: async (enabled: boolean) => {
            await api!.axiosInstance.post(`${api!.basePath}/LiveChannels/Admin/Enabled`, { Enabled: enabled }, { headers: headers(api!) });
        },
        onSuccess: invalidate
    });
};

/** Turns one or more channels on or off. */
export const useSetChannelsEnabled = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: async ({ channelIds, enabled }: { channelIds: string[]; enabled: boolean }) => {
            await api!.axiosInstance.post(
                `${api!.basePath}/LiveChannels/Admin/Channels`,
                { ChannelIds: channelIds, Enabled: enabled },
                { headers: headers(api!) }
            );
        },
        // Show the switch flipped right away; the refetch brings in the new content counts
        onMutate: ({ channelIds, enabled }) => {
            const ids = new Set(channelIds);
            queryClient.setQueryData<LiveChannelsAdmin>([ QUERY_KEY ], previous => previous && {
                ...previous,
                Channels: previous.Channels.map(c => (ids.has(c.Id) ? { ...c, Enabled: enabled } : c))
            });
        },
        onSettled: invalidate
    });
};

/** Discards every schedule and lays them out again from the current library. */
export const useRebuildLiveChannelSchedules = () => {
    const { api } = useApi();
    return useMutation({
        mutationFn: async () => {
            await api!.axiosInstance.post(`${api!.basePath}/LiveChannels/Reset`, null, { headers: headers(api!) });
        },
        onSuccess: invalidate
    });
};
