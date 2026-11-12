import { Api } from '@khylo/sdk';
import { useQuery } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import type { AxiosRequestConfig } from 'axios';
import { getLibraryStructureApi } from '@khylo/sdk/lib/utils/api/library-structure-api';

export const QUERY_KEY = 'VirtualFolders';

const fetchVirtualFolders = async (api: Api, options?: AxiosRequestConfig) => {
    const response = await getLibraryStructureApi(api).getVirtualFolders(options);

    return response.data;
};

/** The libraries. While one is scanning (or a scan was just asked for) they are asked again every two seconds. */
export const useVirtualFolders = (watchScans = false) => {
    const { api } = useApi();

    return useQuery({
        queryKey: [ QUERY_KEY ],
        queryFn: ({ signal }) => fetchVirtualFolders(api!, { signal }),
        enabled: !!api,
        refetchInterval: query => (watchScans || query.state.data?.some(folder => folder.RefreshStatus === 'Active') ? 2000 : false)
    });
};
