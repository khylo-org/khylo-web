import type { AuthenticationApiRevokeKeyRequest } from '@khylo/sdk/lib/generated-client/api/authentication-api';
import { getAuthenticationApi } from '@khylo/sdk/lib/utils/api/authentication-api';
import { useMutation } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';
import { queryClient } from 'utils/query/queryClient';
import { QUERY_KEY } from './useApiKeys';

export const useRevokeKey = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: (params: AuthenticationApiRevokeKeyRequest) => (
            getAuthenticationApi(api!)
                .revokeKey(params)
        ),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: [ QUERY_KEY ]
            });
        }
    });
};
