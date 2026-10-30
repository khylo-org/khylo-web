import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';
import { type InvitationDto, QUERY_KEY } from './useInvitations';

export interface CreateInvitationRequest {
    LifetimeHours?: number;
    MaxUses?: number;
    EnabledFolders?: string[];
}

export const useCreateInvitation = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async (request: CreateInvitationRequest): Promise<InvitationDto> => {
            const url = `${api!.basePath}/Invitations`;
            const response = await axios.post<InvitationDto>(url, request, {
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

export default useCreateInvitation;
