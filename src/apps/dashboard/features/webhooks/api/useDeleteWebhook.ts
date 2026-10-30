import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';
import { QUERY_KEY } from './useWebhooks';

export const useDeleteWebhook = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async (webhookId: string): Promise<void> => {
            const url = `${api!.basePath}/Webhooks/${encodeURIComponent(webhookId)}`;
            await axios.delete(url, {
                headers: {
                    Authorization: `MediaBrowser Token="${api!.accessToken}"`
                }
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: [ QUERY_KEY ]
            });
        }
    });
};

export default useDeleteWebhook;
