import React, { FC, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import LockIcon from '@mui/icons-material/Lock';
import ShieldIcon from '@mui/icons-material/Shield';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';

import { useUser } from 'hooks/api/useUser';
import { UserTab } from 'apps/dashboard/features/users/constants/userTab';
import Profile from 'apps/dashboard/features/users/components/Profile';
import Access from 'apps/dashboard/features/users/components/Access';
import ParentalControl from 'apps/dashboard/features/users/components/ParentalControl';
import Password from 'apps/dashboard/features/users/components/Password';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloTabs,
    KhyloPanel,
    KhyloStatusBadge,
    type KhyloTabItem
} from '../../components/ui';

export const Component: FC = () => {
    const navigate = useNavigate();
    const { userId, tab = UserTab.Profile } = useParams<{ userId: string; tab?: string }>();
    const { data: user, isPending, isError } = useUser({ userId });

    const activeTab = useMemo(() => {
        const validTabs: string[] = [UserTab.Profile, UserTab.Access, UserTab.ParentalControl, UserTab.Password];
        return tab && validTabs.includes(tab) ? tab : UserTab.Profile;
    }, [tab]);

    const handleTabChange = useCallback((newTabId: string) => {
        if (userId) {
            navigate(`/dashboard/users/${userId}/${newTabId}`);
        }
    }, [navigate, userId]);

    const tabs: KhyloTabItem[] = useMemo(() => [
        { id: UserTab.Profile, label: 'Profile & Capabilities', icon: <PersonIcon sx={{ fontSize: 16 }} /> },
        { id: UserTab.Access, label: 'Media Library Access', icon: <SecurityIcon sx={{ fontSize: 16 }} /> },
        { id: UserTab.ParentalControl, label: 'Parental Controls & Tags', icon: <ShieldIcon sx={{ fontSize: 16 }} /> },
        { id: UserTab.Password, label: 'Password & Credentials', icon: <LockIcon sx={{ fontSize: 16 }} /> }
    ], []);

    if (isPending) {
        return (
            <KhyloPage>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} sx={{ color: KHYLO_COLORS.accent }} />
                </Box>
            </KhyloPage>
        );
    }

    if (isError || !user) {
        return (
            <KhyloPage>
                <Alert severity='error' sx={{ mb: 3 }}>
                    Failed to load user account details from server.
                </Alert>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/dashboard/users')}
                    sx={{ textTransform: 'none', color: KHYLO_COLORS.accent }}
                >
                    Back to User Accounts
                </Button>
            </KhyloPage>
        );
    }

    const isAdmin = Boolean(user.Policy?.IsAdministrator);
    const isDisabled = Boolean(user.Policy?.IsDisabled);

    return (
        <KhyloPage>
            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Access Control' },
                    { label: 'User Accounts', href: '/dashboard/users' },
                    { label: user.Name || 'Account' }
                ]}
                title={user.Name || 'User Account'}
                subtitle={`User ID: ${user.Id} • Configure authentication, playback thresholds, content permissions, and library access.`}
                badge={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <KhyloStatusBadge
                            label={isAdmin ? 'Administrator' : 'Standard Member'}
                            color={isAdmin ? 'active' : 'idle'}
                        />
                        {isDisabled && (
                            <KhyloStatusBadge
                                label='Account Disabled'
                                color='failed'
                            />
                        )}
                    </Box>
                }
                actions={
                    <Button
                        variant='outlined'
                        size='small'
                        startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
                        onClick={() => navigate('/dashboard/users')}
                        sx={{
                            textTransform: 'none',
                            borderColor: KHYLO_COLORS.borderDefault,
                            color: KHYLO_COLORS.textSecondary,
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            '&:hover': { color: KHYLO_COLORS.textPrimary }
                        }}
                    >
                        All Users
                    </Button>
                }
            />

            <Box sx={{ mb: 2.5 }}>
                <KhyloTabs
                    tabs={tabs}
                    activeTab={activeTab}
                    onChange={handleTabChange}
                />
            </Box>

            <KhyloPanel sx={{ p: { xs: 2, sm: 3 } }}>
                {activeTab === UserTab.Profile && (
                    <Profile userDto={user} />
                )}
                {activeTab === UserTab.Access && (
                    <Access userId={user.Id || ''} />
                )}
                {activeTab === UserTab.ParentalControl && (
                    <ParentalControl userId={user.Id || ''} />
                )}
                {activeTab === UserTab.Password && (
                    <Password user={user} />
                )}
            </KhyloPanel>
        </KhyloPage>
    );
};

export default Component;
