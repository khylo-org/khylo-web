import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';

export const useTestWebhook = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async (webhookId: string): Promise<boolean> => {
            const url = `${api!.basePath}/Webhooks/${encodeURIComponent(webhookId)}/Test`;
            const response = await axios.post<{ Success: boolean }>(url, {}, {
                headers: {
                    Authorization: `MediaBrowser Token="${api!.accessToken}"`
                }
            });
            return response.data?.Success ?? true;
        }
    });
};

export default useTestWebhook;
