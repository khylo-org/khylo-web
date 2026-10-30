import type { VideoApiDeleteAlternateSourcesRequest } from '@khylo/sdk/lib/generated-client/api/video-api';
import { getVideoApi } from '@khylo/sdk/lib/utils/api/video-api';
import { useMutation } from '@tanstack/react-query';
import { type KhyloApiContext, useApi } from 'hooks/useApi';

const deleteAlternateSources = async (
    apiContext: KhyloApiContext,
    params: VideoApiDeleteAlternateSourcesRequest
) => {
    const { api } = apiContext;

    if (!api) throw new Error('[deleteAlternateSources] No API instance available');

    const response = await getVideoApi(api).deleteAlternateSources(params);
    return response.data;
};

export const useDeleteAlternateSources = () => {
    const apiContext = useApi();
    return useMutation({
        mutationFn: (params: VideoApiDeleteAlternateSourcesRequest) =>
            deleteAlternateSources(apiContext, params)
    });
};
