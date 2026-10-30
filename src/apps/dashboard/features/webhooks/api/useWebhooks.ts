import type { Api } from '@khylo/sdk';
import { queryOptions, useQuery } from '@tanstack/react-query';
import axios, { type AxiosRequestConfig } from 'axios';
import { useApi } from 'hooks/useApi';

export interface KhyloWebhookDto {
    Id: string;
    Name: string;
    Url: string;
    Secret?: string;
    Events: string[];
    IsEnabled: boolean;
    CreatedAt: string;
    LastTriggeredAt?: string;
    FailureCount: number;
}

export const QUERY_KEY = 'Webhooks';

const fetchWebhooks = async (
    api: Api,
    options?: AxiosRequestConfig
): Promise<KhyloWebhookDto[]> => {
    const url = `${api.basePath}/Webhooks`;
    const response = await axios.get<KhyloWebhookDto[]>(url, {
        ...options,
        headers: {
            Authorization: `MediaBrowser Token="${api.accessToken}"`,
            ...options?.headers
        }
    });
    return response.data;
};

export const getWebhooksQuery = (api?: Api) => queryOptions({
    queryKey: [ QUERY_KEY ],
    queryFn: ({ signal }) => fetchWebhooks(api!, { signal }),
    enabled: !!api
});

export const useWebhooks = () => {
    const { api } = useApi();
    return useQuery(getWebhooksQuery(api));
};

export default useWebhooks;
