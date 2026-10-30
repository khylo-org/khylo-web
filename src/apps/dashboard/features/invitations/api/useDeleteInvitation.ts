import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';
import { QUERY_KEY } from './useInvitations';

/** Removes a used, expired or revoked invitation from the list. Accounts made with it are kept. */
export const useDeleteInvitation = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async (invitationId: string): Promise<void> => {
            await axios.delete(`${api!.basePath}/Invitations/${encodeURIComponent(invitationId)}`, {
                headers: { Authorization: `MediaBrowser Token="${api!.accessToken}"` }
            });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [ QUERY_KEY ] });
        }
    });
};

/** Removes every used, expired and revoked invitation. Accounts made with them are kept. */
export const useClearFinishedInvitations = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async (): Promise<number> => {
            const response = await axios.delete<number>(`${api!.basePath}/Invitations/Finished`, {
                headers: { Authorization: `MediaBrowser Token="${api!.accessToken}"` }
            });
            return response.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [ QUERY_KEY ] });
        }
    });
};
