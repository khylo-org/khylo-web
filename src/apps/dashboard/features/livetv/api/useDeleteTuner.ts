import { useMutation } from '@tanstack/react-query';

import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';
import { getLiveTvApi } from '@khylo/sdk/lib/utils/api/live-tv-api';
import { LiveTvApiDeleteTunerHostRequest } from '@khylo/sdk/lib/generated-client/api/live-tv-api';

export const useDeleteTuner = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: (params: LiveTvApiDeleteTunerHostRequest) => (
            getLiveTvApi(api!)
                .deleteTunerHost(params)
        ),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: [ 'NamedConfiguration', 'livetv' ]
            });
        }
    });
};
