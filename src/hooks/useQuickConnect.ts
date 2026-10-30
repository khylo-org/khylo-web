import { getAuthenticationApi } from '@khylo/sdk/lib/utils/api/authentication-api';
import { useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { type KhyloApiContext, useApi } from './useApi';

const fetchQuickConnectEnabled = async (
    apiContext: KhyloApiContext,
    options?: AxiosRequestConfig
) => {
    const { api } = apiContext;
    if (!api) throw new Error('No API instance available');

    const response = await getAuthenticationApi(api)
        .getQuickConnectEnabled(options);
    return response.data;
};

export const useQuickConnectEnabled = () => {
    const currentApi = useApi();
    return useQuery({
        queryKey: [ 'QuickConnect', 'Enabled' ],
        queryFn: ({ signal }) => fetchQuickConnectEnabled(currentApi, { signal })
    });
};
