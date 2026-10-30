import { ScheduledTaskApiStartTaskRequest } from '@khylo/sdk/lib/generated-client/api/scheduled-task-api';
import { getScheduledTaskApi } from '@khylo/sdk/lib/utils/api/scheduled-task-api';
import { TaskState } from '@khylo/sdk/lib/generated-client/models/task-state';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useApi } from 'hooks/useApi';
import { ServerConnections } from 'lib/khylo-apiclient';
import { queryClient } from 'utils/query/queryClient';
import { QUERY_KEY } from './useTasks';

export const useStartTask = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: async (params: ScheduledTaskApiStartTaskRequest) => {
            const taskId = params.taskId;
            const legacyClient = ServerConnections.currentApiClient();
            const token = api?.accessToken || (legacyClient?.accessToken ? legacyClient.accessToken() : '');
            const baseUrl = api?.basePath || (legacyClient?.serverAddress ? legacyClient.serverAddress() : '');
            const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, '') : '';
            const url = `${cleanBase}/ScheduledTasks/Running/${taskId}`;

            // 1. Try SDK API first
            if (api) {
                try {
                    return await getScheduledTaskApi(api).startTask(params);
                } catch (sdkErr) {
                    console.warn('[useStartTask] SDK startTask failed, trying direct axios:', sdkErr);
                }
            }

            // 2. Direct HTTP call fallback (always works with auth token)
            try {
                return await axios.post(url, null, {
                    headers: token ? {
                        Authorization: `MediaBrowser Token="${token}"`
                    } : undefined
                });
            } catch (axiosErr) {
                console.warn('[useStartTask] direct axios failed, trying legacy client:', axiosErr);
            }

            // 3. Try legacy ApiClient
            if (legacyClient && typeof (legacyClient as any).startScheduledTask === 'function') {
                return await (legacyClient as any).startScheduledTask(taskId);
            }
        },
        onMutate: async ({ taskId }) => {
            await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
            const previousTasks = queryClient.getQueryData<any[]>([QUERY_KEY]);
            if (previousTasks) {
                queryClient.setQueryData(
                    [QUERY_KEY],
                    previousTasks.map(t => (t.Id === taskId ? { ...t, State: TaskState.Running, CurrentProgressPercentage: 0 } : t))
                );
            }
            // Also update single task query cache if active
            const previousSingleTask = queryClient.getQueryData<any>([QUERY_KEY, taskId]);
            if (previousSingleTask) {
                queryClient.setQueryData(
                    [QUERY_KEY, taskId],
                    { ...previousSingleTask, State: TaskState.Running, CurrentProgressPercentage: 0 }
                );
            }
            return { previousTasks, previousSingleTask };
        },
        onError: (_err, { taskId }, context) => {
            if (context?.previousTasks) {
                queryClient.setQueryData([QUERY_KEY], context.previousTasks);
            }
            if (context?.previousSingleTask) {
                queryClient.setQueryData([QUERY_KEY, taskId], context.previousSingleTask);
            }
        },
        onSettled: (_data, _error, { taskId }) => {
            void queryClient.invalidateQueries({
                queryKey: [QUERY_KEY]
            });
            void queryClient.invalidateQueries({
                queryKey: [QUERY_KEY, taskId]
            });
        }
    });
};
