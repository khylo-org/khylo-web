import type { AxiosRequestConfig } from 'axios';
import type { LiveTvApiGetTimerRequest } from '@khylo/sdk/lib/generated-client';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { type KhyloApiContext, useApi } from 'hooks/useApi';

const getTimer = async (
    currentApi: KhyloApiContext,
    params: LiveTvApiGetTimerRequest,
    options?: AxiosRequestConfig
) => {
    const { api } = currentApi;

    if (!api) throw new Error('[getTimer] No API instance available');

    const response = await getLiveTvApi(api).getTimer(params, options);
    return response.data;
};

export const getTimerQuery = (
    apiContext: KhyloApiContext,
    params: LiveTvApiGetTimerRequest
) =>
    queryOptions({
        queryKey: ['Timer', params.timerId],
        queryFn: ({ signal }) => getTimer(apiContext, params, { signal }),
        enabled: !!apiContext.api && !!apiContext.user?.Id && !!params.timerId
    });

export const useGetTimer = (requestParameters: LiveTvApiGetTimerRequest) => {
    const apiContext = useApi();
    return useQuery(getTimerQuery(apiContext, requestParameters));
};
