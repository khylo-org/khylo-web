import { Api } from '@khylo/sdk';
import { useQuery } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import { getSystemApi } from '@khylo/sdk/lib/utils/api/system-api';
import type { AxiosRequestConfig } from 'axios';
import type { NetworkConfiguration } from '@khylo/sdk/lib/generated-client/models/network-configuration';

const fetchNetworkConfig = async (api: Api, options?: AxiosRequestConfig) => {
    const response = await getSystemApi(api).getNamedConfiguration({ key: 'network' }, options);

    return response.data as NetworkConfiguration;
};

export const useNetworkConfig = () => {
    const { api } = useApi();

    return useQuery({
        queryKey: [ 'NetConfig' ],
        queryFn: ({ signal }) => fetchNetworkConfig(api!, { signal }),
        enabled: !!api
    });
};
