import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useApi } from 'hooks/useApi';
import { ServerConnections } from 'lib/khylo-apiclient';
import { queryClient } from 'utils/query/queryClient';

export interface MetadataItemSummary {
    Id: string;
    Name: string;
    OriginalTitle?: string;
    SortName?: string;
    Type: string;
    MediaType?: string;
    ProductionYear?: number;
    PremiereDate?: string;
    Overview?: string;
    CommunityRating?: number;
    CriticRating?: number;
    OfficialRating?: string;
    Genres?: string[];
    Studios?: Array<{ Name?: string; Id?: string }> | string[];
    Tags?: string[];
    LockData?: boolean;
    LockedFields?: string[];
    ProviderIds?: Record<string, string>;
    ImageTags?: Record<string, string>;
    PrimaryImageAspectRatio?: number;
    Path?: string;
    Container?: string;
}

export interface MetadataItemsResponse {
    Items: MetadataItemSummary[];
    TotalRecordCount: number;
}

export interface UseMetadataItemsParams {
    libraryId?: string;
    searchTerm?: string;
    itemType?: string;
    limit?: number;
    startIndex?: number;
    missingOverview?: boolean;
    missingPoster?: boolean;
}

function getApiCredentials(api?: any) {
    const legacyClient = ServerConnections.currentApiClient();
    const token = api?.accessToken || (legacyClient?.accessToken ? legacyClient.accessToken() : '');
    const baseUrl = api?.basePath || (legacyClient?.serverAddress ? legacyClient.serverAddress() : '');
    const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `MediaBrowser Token="${token}"`;
    }
    return { token, cleanBase, headers };
}

export const useMetadataItems = (params: UseMetadataItemsParams) => {
    const { api } = useApi();
    const { libraryId, searchTerm, itemType, limit = 50, startIndex = 0, missingOverview, missingPoster } = params;

    return useQuery<MetadataItemsResponse>({
        queryKey: ['metadata-items', libraryId, searchTerm, itemType, limit, startIndex, missingOverview, missingPoster],
        queryFn: async () => {
            const { cleanBase, headers } = getApiCredentials(api);
            const queryParams = new URLSearchParams();
            queryParams.append('Recursive', 'true');
            queryParams.append('Limit', String(limit));
            queryParams.append('StartIndex', String(startIndex));
            queryParams.append('Fields', 'Overview,ProviderIds,Genres,Studios,Tags,OfficialRating,CommunityRating,CriticRating,LockData,LockedFields,PrimaryImageAspectRatio,Path,Container');

            if (libraryId && libraryId !== 'all') {
                queryParams.append('ParentId', libraryId);
            }

            if (searchTerm && searchTerm.trim()) {
                queryParams.append('SearchTerm', searchTerm.trim());
            }

            if (itemType && itemType !== 'all') {
                queryParams.append('IncludeItemTypes', itemType);
            } else {
                queryParams.append('IncludeItemTypes', 'Movie,Series,Episode,MusicAlbum,Audio,Book');
            }

            const url = `${cleanBase}/Items?${queryParams.toString()}`;
            const res = await axios.get(url, { headers });
            let items: MetadataItemSummary[] = res.data?.Items ?? [];

            if (missingOverview) {
                items = items.filter(i => !i.Overview || !i.Overview.trim());
            }
            if (missingPoster) {
                items = items.filter(i => !i.ImageTags?.Primary);
            }

            return {
                Items: items,
                TotalRecordCount: res.data?.TotalRecordCount ?? items.length
            };
        },
        enabled: Boolean(api || ServerConnections.currentApiClient())
    });
};

export const useItemMetadata = (itemId?: string) => {
    const { api } = useApi();

    return useQuery<MetadataItemSummary>({
        queryKey: ['item-metadata', itemId],
        queryFn: async () => {
            if (!itemId) throw new Error('No itemId specified');
            const { cleanBase, headers } = getApiCredentials(api);
            const url = `${cleanBase}/Items/${itemId}`;
            const res = await axios.get(url, { headers });
            return res.data;
        },
        enabled: Boolean(itemId && (api || ServerConnections.currentApiClient()))
    });
};

export const useUpdateItemMetadata = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async (item: Partial<MetadataItemSummary> & { Id: string }) => {
            const { cleanBase, headers } = getApiCredentials(api);
            const url = `${cleanBase}/Items/${item.Id}`;
            const res = await axios.post(url, item, {
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                }
            });
            return res.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['item-metadata', variables.Id] });
            queryClient.invalidateQueries({ queryKey: ['metadata-items'] });
        }
    });
};

export const useRefreshItemMetadata = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async (itemId: string) => {
            const { cleanBase, headers } = getApiCredentials(api);
            const url = `${cleanBase}/Items/${itemId}/Refresh?MetadataRefreshMode=FullRefresh&ImageRefreshMode=FullRefresh&ReplaceAllMetadata=true&ReplaceAllImages=true`;
            const res = await axios.post(url, null, { headers });
            return res.data;
        },
        onSuccess: (_data, itemId) => {
            queryClient.invalidateQueries({ queryKey: ['item-metadata', itemId] });
            queryClient.invalidateQueries({ queryKey: ['metadata-items'] });
        }
    });
};
