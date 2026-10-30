import type { Api } from '@khylo/sdk';
import { queryOptions, useQuery } from '@tanstack/react-query';
import axios, { type AxiosRequestConfig } from 'axios';
import { useApi } from 'hooks/useApi';

export interface SystemTelemetry {
    CpuPercent: number;
    ProcessMemoryUsedBytes: number;
    TotalPhysicalMemoryBytes: number;
    ActiveStreamsCount: number;
    ActiveTranscodesCount: number;
    HardwareTranscodesCount: number;
    ServerUptimeSeconds: number;
    ThreadCount: number;
}

const fetchSystemTelemetry = async (
    api: Api,
    options?: AxiosRequestConfig
): Promise<SystemTelemetry> => {
    const url = `${api.basePath}/System/Info/Telemetry`;
    const response = await axios.get<SystemTelemetry>(url, {
        ...options,
        headers: {
            Authorization: `MediaBrowser Token="${api.accessToken}"`,
            ...options?.headers
        }
    });
    return response.data;
};

export const getSystemTelemetryQuery = (api?: Api) => queryOptions({
    queryKey: ['SystemTelemetry'],
    queryFn: ({ signal }) => fetchSystemTelemetry(api!, { signal }),
    enabled: !!api,
    refetchInterval: 3000,
    refetchOnWindowFocus: true
});

export const useSystemTelemetry = () => {
    const { api } = useApi();
    return useQuery(getSystemTelemetryQuery(api));
};

export default useSystemTelemetry;
