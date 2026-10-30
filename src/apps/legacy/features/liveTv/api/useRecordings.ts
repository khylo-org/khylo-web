import type { Api } from '@khylo/sdk';
import type { LiveTvApiGetRecordingsRequest } from '@khylo/sdk/lib/generated-client/api/live-tv-api';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { useApi } from 'hooks/useApi';

const fetchRecordings = async (
    api: Api,
    params?: LiveTvApiGetRecordingsRequest,
    options?: AxiosRequestConfig
) => {
    const response = await getLiveTvApi(api).getRecordings(params, options);
    return response.data;
};

export const getRecordingsQuery = (
    api?: Api,
    params?: LiveTvApiGetRecordingsRequest
) => queryOptions({
    queryKey: [ 'User', params?.userId, 'Recordings', params ],
    queryFn: ({ signal }) => fetchRecordings(api!, params, { signal }),
    enabled: !!api
});

export const useRecordings = (
    params?: LiveTvApiGetRecordingsRequest
) => {
    const { api, user } = useApi();
    return useQuery(getRecordingsQuery(api, {
        ...params,
        userId: params?.userId || user?.Id
    }));
};
