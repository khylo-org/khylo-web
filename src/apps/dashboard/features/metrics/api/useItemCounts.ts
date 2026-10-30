import type { Api } from '@khylo/sdk';
import type { LibraryApiGetItemCountsRequest } from '@khylo/sdk/lib/generated-client/api/library-api';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { useApi } from 'hooks/useApi';

const fetchItemCounts = async (
    api: Api,
    params?: LibraryApiGetItemCountsRequest,
    options?: AxiosRequestConfig
) => {
    const response = await getLibraryApi(api)
        .getItemCounts(params, options);
    return response.data;
};

const getItemCountsQuery = (
    api?: Api,
    params?: LibraryApiGetItemCountsRequest
) => queryOptions({
    queryKey: [ 'ItemCounts', params ],
    queryFn: ({ signal }) => fetchItemCounts(api!, params, { signal }),
    enabled: !!api,
    refetchOnWindowFocus: false
});

export const useItemCounts = (
    params?: LibraryApiGetItemCountsRequest
) => {
    const { api } = useApi();
    return useQuery(getItemCountsQuery(api, params));
};
