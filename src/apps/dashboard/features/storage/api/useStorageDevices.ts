import type { Api } from '@khylo/sdk';
import { queryOptions, useQuery } from '@tanstack/react-query';
import axios, { type AxiosRequestConfig } from 'axios';
import { useApi } from 'hooks/useApi';

export interface StorageDeviceInfo {
    Path: string;
    Name: string;
    FileSystem: string;
    TotalBytes: number;
    AvailableBytes: number;
    UsedBytes: number;
    PercentUsed: number;
    WarningState: 'None' | 'Warning' | 'Critical';
}

const fetchStorageDevices = async (
    api: Api,
    options?: AxiosRequestConfig
): Promise<StorageDeviceInfo[]> => {
    const url = `${api.basePath}/Environment/StorageDevices`;
    const response = await axios.get<any[]>(url, {
        ...options,
        headers: {
            Authorization: `MediaBrowser Token="${api.accessToken}"`,
            ...options?.headers
        }
    });
    return (response.data || []).map((d: any) => {
        const total = Number(d.TotalSpace ?? d.TotalBytes ?? 0);
        const free = Number(d.FreeSpace ?? d.AvailableBytes ?? 0);
        const used = Number(d.UsedSpace ?? d.UsedBytes ?? Math.max(0, total - free));
        const percent = Number(d.PercentUsed ?? (total > 0 ? (used / total) * 100 : 0));
        let warning: 'None' | 'Warning' | 'Critical' = 'None';
        if (d.IsCriticalSpaceWarning || d.WarningState === 'Critical' || percent >= 95) {
            warning = 'Critical';
        } else if (d.IsLowSpaceWarning || d.WarningState === 'Warning' || percent >= 85) {
            warning = 'Warning';
        }
        return {
            Path: d.Path || '',
            Name: d.Name || d.Path || 'Drive',
            FileSystem: d.FileSystem || 'NTFS',
            TotalBytes: total,
            AvailableBytes: free,
            UsedBytes: used,
            PercentUsed: percent,
            WarningState: warning
        };
    });
};

export const getStorageDevicesQuery = (api?: Api) => queryOptions({
    queryKey: ['StorageDevices'],
    queryFn: ({ signal }) => fetchStorageDevices(api!, { signal }),
    enabled: !!api,
    refetchInterval: 15000,
    refetchOnWindowFocus: true
});

export const useStorageDevices = () => {
    const { api } = useApi();
    return useQuery(getStorageDevicesQuery(api));
};

export default useStorageDevices;
