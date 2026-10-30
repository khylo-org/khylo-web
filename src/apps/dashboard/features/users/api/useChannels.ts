import { Api } from '@khylo/sdk';
import { useQuery } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import { getChannelApi } from '@khylo/sdk/lib/utils/api/channel-api';
import { ChannelApiGetChannelsRequest } from '@khylo/sdk/lib/generated-client/api/channel-api';
import type { AxiosRequestConfig } from 'axios';

const fetchChannels = async (api: Api, params?: ChannelApiGetChannelsRequest, options?: AxiosRequestConfig) => {
    const response = await getChannelApi(api).getChannels(params, options);

    return response.data;
};

export const useChannels = (params?: ChannelApiGetChannelsRequest) => {
    const { api } = useApi();

    return useQuery({
        queryKey: [ 'Channels' ],
        queryFn: ({ signal }) => fetchChannels(api!, params, { signal }),
        enabled: !!api
    });
};
