import type { LiveTvApiCancelSeriesTimerRequest } from '@khylo/sdk/lib/generated-client';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';
import { useMutation } from '@tanstack/react-query';
import { type KhyloApiContext, useApi } from 'hooks/useApi';

const cancelSeriesTimer = async (
    apiContext: KhyloApiContext,
    params: LiveTvApiCancelSeriesTimerRequest
) => {
    const { api } = apiContext;

    if (!api) throw new Error('[cancelSeriesTimer] No API instance available');

    const response = await getLiveTvApi(api).cancelSeriesTimer(params);
    return response.data;
};

export const useCancelSeriesTimer = () => {
    const apiContext = useApi();
    return useMutation({
        mutationFn: (params: LiveTvApiCancelSeriesTimerRequest) =>
            cancelSeriesTimer(apiContext, params)
    });
};
