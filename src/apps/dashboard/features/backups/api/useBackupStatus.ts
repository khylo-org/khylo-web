import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { useApi } from 'hooks/useApi';

export interface BackupRunStatus {
    InProgress: boolean;
    StartedAt?: string | null;
    BytesSoFar: number;
    Error?: string | null;
}

/** Whether a backup is running on the server and how big it is so far. Asked every 2 seconds. */
export const useBackupStatus = () => {
    const { api } = useApi();

    return useQuery({
        queryKey: ['BackupStatus'],
        enabled: Boolean(api),
        refetchInterval: 2000,
        queryFn: async () => (await axios.get<BackupRunStatus>(`${api?.basePath}/Backup/Status`, {
            headers: { Authorization: `MediaBrowser Token="${api?.accessToken ?? ''}"` }
        })).data
    });
};
