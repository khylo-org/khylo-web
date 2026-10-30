import { Api } from '@khylo/sdk/lib/api';
import { LibraryApiGetItemsRequest } from '@khylo/sdk/lib/generated-client/api/library-api';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import { AxiosRequestConfig } from 'axios';
import { QUERY_OPTIONS } from '../constants/queryOptions';

export const fetchItemsByType = async (
    api: Api,
    userId?: string,
    params?: LibraryApiGetItemsRequest,
    options?: AxiosRequestConfig
) => {
    const response = await getLibraryApi(api).getItems(
        {
            ...QUERY_OPTIONS,
            userId,
            recursive: true,
            ...params
        },
        options
    );
    return response.data;
};
