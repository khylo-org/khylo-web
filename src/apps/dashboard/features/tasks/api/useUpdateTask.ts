import { ScheduledTaskApiUpdateTaskRequest } from '@khylo/sdk/lib/generated-client/api/scheduled-task-api';
import { getScheduledTaskApi } from '@khylo/sdk/lib/utils/api/scheduled-task-api';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useApi } from 'hooks/useApi';
import { ServerConnections } from 'lib/khylo-apiclient';
import { queryClient } from 'utils/query/queryClient';
import { QUERY_KEY } from './useTasks';

export const useUpdateTask = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async (params: ScheduledTaskApiUpdateTaskRequest) => {
            const legacyClient = ServerConnections.currentApiClient();
            const token = api?.accessToken || (legacyClient?.accessToken ? legacyClient.accessToken() : '');
            const baseUrl = api?.basePath || (legacyClient?.serverAddress ? legacyClient.serverAddress() : '');
            const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
            const directUrl = `${cleanBase}/ScheduledTasks/${params.taskId}/Triggers`;

            if (api) {
                try {
                    return await getScheduledTaskApi(api).updateTask(params);
                } catch (sdkErr) {
                    console.warn('[useUpdateTask] SDK updateTask failed, falling back:', sdkErr);
                }
            }

            return await axios.post(directUrl, params.taskTriggerInfo, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `MediaBrowser Token="${token}"`
                }
            });
        },
        onSuccess: (_data, params) => {
            void queryClient.invalidateQueries({
                queryKey: [ QUERY_KEY, params.taskId ]
            });
            void queryClient.invalidateQueries({
                queryKey: [ QUERY_KEY ]
            });
        }
    });
};
