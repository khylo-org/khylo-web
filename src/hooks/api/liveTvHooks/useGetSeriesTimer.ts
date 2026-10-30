import type { AxiosRequestConfig } from 'axios';
import type { LiveTvApiGetSeriesTimerRequest } from '@khylo/sdk/lib/generated-client';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { type KhyloApiContext, useApi } from 'hooks/useApi';

const getSeriesTimer = async (
    apiContext: KhyloApiContext,
    params: LiveTvApiGetSeriesTimerRequest,
    options?: AxiosRequestConfig
) => {
    const { api } = apiContext;

    if (!api) throw new Error('[getSeriesTimer] No API instance available');

    const response = await getLiveTvApi(api).getSeriesTimer(params, options);
    return response.data;
};

export const getSeriesTimerQuery = (
    apiContext: KhyloApiContext,
    params: LiveTvApiGetSeriesTimerRequest
) =>
    queryOptions({
        queryKey: ['SeriesTimer', params.timerId],
        queryFn: ({ signal }) => getSeriesTimer(apiContext, params, { signal }),
        enabled: !!apiContext.api && !!apiContext.user?.Id && !!params.timerId
    });

export const useGetSeriesTimer = (
    requestParameters: LiveTvApiGetSeriesTimerRequest
) => {
    const apiContext = useApi();
    return useQuery(getSeriesTimerQuery(apiContext, requestParameters));
};
