import { Api } from '@khylo/sdk';
import { CollectionType } from '@khylo/sdk/lib/generated-client/models/collection-type';
import { useQuery } from '@tanstack/react-query';
import { AxiosRequestConfig } from 'axios';
import { useApi } from 'hooks/useApi';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { LibraryApiGetItemsRequest } from '@khylo/sdk/lib/generated-client/api/library-api';
import { fetchItemsByType } from './fetchItemsByType';

const fetchPrograms = async (
    api: Api,
    userId: string,
    params?: LibraryApiGetItemsRequest,
    options?: AxiosRequestConfig
) => {
    const response = await fetchItemsByType(
        api,
        userId,
        {
            includeItemTypes: [BaseItemKind.LiveTvProgram],
            ...params
        },
        options
    );

    return response;
};

export const useProgramsSearch = (
    parentId?: string,
    collectionType?: CollectionType,
    searchTerm?: string
) => {
    const { api, user } = useApi();
    const userId = user?.Id;

    return useQuery({
        queryKey: ['Search', 'Programs', collectionType, parentId, searchTerm],
        queryFn: ({ signal }) => fetchPrograms(
            api!,
            userId!,
            {
                parentId,
                searchTerm
            },
            { signal }
        ),
        enabled: !!api && !!userId && !collectionType
    });
};
