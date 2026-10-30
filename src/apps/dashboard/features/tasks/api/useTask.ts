import type { ScheduledTaskApiGetTaskRequest } from '@khylo/sdk/lib/generated-client/api/scheduled-task-api';
import type { AxiosRequestConfig } from 'axios';
import type { Api } from '@khylo/sdk';
import { getScheduledTaskApi } from '@khylo/sdk/lib/utils/api/scheduled-task-api';
import { useQuery } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import { QUERY_KEY } from './useTasks';

const fetchTask = async (
    api: Api,
    params: ScheduledTaskApiGetTaskRequest,
    options?: AxiosRequestConfig
) => {
    const response = await getScheduledTaskApi(api).getTask(params, options);

    return response.data;
};

export const useTask = (params: ScheduledTaskApiGetTaskRequest) => {
    const { api } = useApi();

    return useQuery({
        queryKey: [ QUERY_KEY, params.taskId ],
        queryFn: ({ signal }) =>
            fetchTask(api!, params, { signal }),
        enabled: Boolean(api && params.taskId),
        refetchInterval: 3000,
        refetchOnWindowFocus: true
    });
};
