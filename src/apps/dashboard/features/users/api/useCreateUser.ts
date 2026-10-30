import { UserApiCreateUserByNameRequest } from '@khylo/sdk/lib/generated-client/api/user-api';
import { getUserApi } from '@khylo/sdk/lib/utils/api/user-api';
import { useMutation } from '@tanstack/react-query';
import { useApi } from 'hooks/useApi';

export const useCreateUser = () => {
    const { api } = useApi();

    return useMutation({
        mutationFn: (params: UserApiCreateUserByNameRequest) => (
            getUserApi(api!)
                .createUserByName(params)
        )
    });
};
