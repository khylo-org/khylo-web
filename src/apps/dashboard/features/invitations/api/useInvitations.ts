import type { Api } from '@khylo/sdk';
import { queryOptions, useQuery } from '@tanstack/react-query';
import axios, { type AxiosRequestConfig } from 'axios';
import { useApi } from 'hooks/useApi';

export interface InvitationDto {
    Id: string;
    Code: string;
    CreatedAtUtc: string;
    ExpiresAtUtc?: string;
    MaxUses: number;
    UseCount: number;
    IsActive: boolean;
    IsValid: boolean;
    EnabledFolders: string[];
    Status: InvitationStatus;
    RevokedAtUtc?: string | null;
    RedeemedBy: InvitationRedemption[];
}

export type InvitationStatus = 'Active' | 'Used' | 'Expired' | 'Revoked';

export interface InvitationRedemption {
    UserId: string;
    Username: string;
    RedeemedAtUtc: string;
}

export const QUERY_KEY = 'Invitations';

const fetchInvitations = async (
    api: Api,
    options?: AxiosRequestConfig
): Promise<InvitationDto[]> => {
    const url = `${api.basePath}/Invitations`;
    const response = await axios.get<InvitationDto[]>(url, {
        ...options,
        headers: {
            Authorization: `MediaBrowser Token="${api.accessToken}"`,
            ...options?.headers
        }
    });
    return response.data;
};

export const getInvitationsQuery = (api?: Api) => queryOptions({
    queryKey: [ QUERY_KEY ],
    queryFn: ({ signal }) => fetchInvitations(api!, { signal }),
    enabled: !!api
});

export const useInvitations = () => {
    const { api } = useApi();
    return useQuery(getInvitationsQuery(api));
};

export default useInvitations;
