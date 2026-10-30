import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';
import { QUERY_KEY } from './useInvitations';

export const useRevokeInvitation = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async (invitationId: string): Promise<void> => {
            const url = `${api!.basePath}/Invitations/${encodeURIComponent(invitationId)}/Revoke`;
            await axios.post(url, null, {
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

export default useRevokeInvitation;
