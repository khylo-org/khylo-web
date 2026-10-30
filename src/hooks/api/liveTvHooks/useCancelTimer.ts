import type { LiveTvApiCancelTimerRequest } from '@khylo/sdk/lib/generated-client';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';
import { useMutation } from '@tanstack/react-query';
import { type KhyloApiContext, useApi } from 'hooks/useApi';

const cancelTimer = async (
    apiContext: KhyloApiContext,
    params: LiveTvApiCancelTimerRequest
) => {
    const { api } = apiContext;

    if (!api) throw new Error('[cancelTimer] No API instance available');

    const response = await getLiveTvApi(api).cancelTimer(params);
    return response.data;
};

export const useCancelTimer = () => {
    const apiContext = useApi();
    return useMutation({
        mutationFn: (params: LiveTvApiCancelTimerRequest) =>
            cancelTimer(apiContext, params)
    });
};
