import { AsyncRoute } from 'components/router/AsyncRoute';

export const ASYNC_PUBLIC_ROUTES: AsyncRoute[] = [
    { path: 'forgotpassword', page: 'session/forgotPassword' },
    { path: 'invite', page: 'session/invite' },
    { path: 'signin', page: 'session/signin' }
];
