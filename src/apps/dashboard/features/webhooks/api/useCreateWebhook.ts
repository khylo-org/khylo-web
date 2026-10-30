import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';
import { type KhyloWebhookDto, QUERY_KEY } from './useWebhooks';

export interface CreateWebhookRequest {
    Name: string;
    Url: string;
    Secret?: string;
    Events: string[];
    IsEnabled?: boolean;
}

export const useCreateWebhook = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async (request: CreateWebhookRequest): Promise<KhyloWebhookDto> => {
            const url = `${api!.basePath}/Webhooks`;
            const response = await axios.post<KhyloWebhookDto>(url, request, {
                headers: {
                    Authorization: `MediaBrowser Token="${api!.accessToken}"`
                }
            });
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: [ QUERY_KEY ]
            });
        }
    });
};

export default useCreateWebhook;
