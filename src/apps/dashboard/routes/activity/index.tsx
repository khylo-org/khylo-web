import React, { FC, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import parseISO from 'date-fns/parseISO';
import format from 'date-fns/format';
import HistoryIcon from '@mui/icons-material/History';

import type { ActivityLogEntry } from '@khylo/sdk/lib/generated-client/models/activity-log-entry';
import { LogLevel } from '@khylo/sdk/lib/generated-client/models/log-level';

import Page from 'components/Page';
import UserAvatarButton from 'apps/dashboard/components/UserAvatarButton';
import { useLogEntries } from 'apps/dashboard/features/activity/api/useLogEntries';
import { useUsersDetails } from 'hooks/useUsers';
import { useLocale } from 'hooks/useLocale';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloTabs,
    KhyloDataTable,
    KhyloStatusBadge,
    KhyloEmptyState,
    type ColumnDef
} from '../../components/ui';

export const Component: FC = () => {
    const { dateFnsLocale } = useLocale();
    const [activeTab, setActiveTab] = useState<'all' | 'user' | 'system'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const logParams = useMemo(() => ({
        startIndex: 0,
        limit: 150,
        hasUserId: activeTab === 'all' ? undefined : activeTab === 'user'
    }), [activeTab]);

    const { data: logData, isLoading } = useLogEntries(logParams);
    const entries = useMemo(() => logData?.Items || [], [logData]);

    const { usersById: users } = useUsersDetails();

    const filteredEntries = useMemo(() => {
        if (!searchTerm.trim()) return entries;
        const term = searchTerm.toLowerCase();
        return entries.filter(e =>
            (e.Name && e.Name.toLowerCase().includes(term)) ||
            (e.ShortOverview && e.ShortOverview.toLowerCase().includes(term)) ||
            (e.Overview && e.Overview.toLowerCase().includes(term)) ||
            (e.Type && e.Type.toLowerCase().includes(term))
        );
    }, [entries, searchTerm]);

    const columns = useMemo<ColumnDef<ActivityLogEntry>[]>(() => [
        {
            id: 'date',
            header: 'Timestamp',
            width: '180px',
            render: (row) => {
                if (!row.Date) return <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>—</Typography>;
                const formatted = format(parseISO(row.Date), 'Pp', { locale: dateFnsLocale });
                return (
                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {formatted}
                    </Typography>
                );
            }
        },
        {
            id: 'severity',
            header: 'Severity',
            width: '110px',
            render: (row) => {
                const sev = row.Severity;
                if (sev === LogLevel.Error || sev === LogLevel.Critical) {
                    return <KhyloStatusBadge label='Error' color='danger' />;
                }
                if (sev === LogLevel.Warning) {
                    return <KhyloStatusBadge label='Warning' color='degraded' />;
                }
                return <KhyloStatusBadge label='Info' color='idle' />;
            }
        },
        {
            id: 'event',
            header: 'Event & Description',
            render: (row) => (
                <Stack spacing={0.25}>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                        {row.Name || row.Type || 'System Event'}
                    </Typography>
                    {(row.ShortOverview || row.Overview) && (
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontSize: '0.75rem' }}>
                            {row.ShortOverview || row.Overview}
                        </Typography>
                    )}
                </Stack>
            )
        },
        {
            id: 'user',
            header: 'User Account',
            width: '180px',
            render: (row) => {
                const user = row.UserId && users ? users[row.UserId] : undefined;
                if (!user && !row.UserId) {
                    return (
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontStyle: 'italic' }}>
                            System Daemon
                        </Typography>
                    );
                }
                return (
                    <Stack direction='row' alignItems='center' spacing={1}>
                        <UserAvatarButton user={user} sx={{ width: 24, height: 24 }} />
                        <Typography variant='body2' sx={{ color: KHYLO_COLORS.textSecondary, fontSize: '0.82rem' }}>
                            {user?.Name || 'User'}
                        </Typography>
                    </Stack>
                );
            }
        }
    ], [dateFnsLocale, users]);

    return (
        <Page id='activityPage' title='Activity Audit Log' className='type-interior mainAnimatedPage'>
            <KhyloPage>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Diagnostics' },
                        { label: 'Activity Log' }
                    ]}
                    title='Operational Activity Audit Log'
                    subtitle='Chronological security audit trail, user authentication records, playback milestones, and administrative events.'
                    badge={
                        <KhyloStatusBadge
                            label={`${entries.length} Events Logged`}
                            color='idle'
                        />
                    }
                >
                    <KhyloTabs
                        activeTab={activeTab}
                        onChange={(tab) => setActiveTab(tab as any)}
                        tabs={[
                            { id: 'all', label: 'All Activity' },
                            { id: 'user', label: 'User Actions' },
                            { id: 'system', label: 'Daemon & System Events' }
                        ]}
                    />
                </KhyloPageHeader>

                {entries.length === 0 && !isLoading ? (
                    <KhyloEmptyState
                        icon={<HistoryIcon />}
                        title='No activity records found'
                        description='System and user events will appear here as playback and administration occur.'
                    />
                ) : (
                    <KhyloDataTable
                        columns={columns}
                        data={filteredEntries}
                        keyExtractor={(item) => String(item.Id || Math.random())}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder='Search audit log…'
                        emptyMessage='No matching activity events found'
                        isLoading={isLoading}
                    />
                )}
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'ActivityLogPage';
export default Component;
