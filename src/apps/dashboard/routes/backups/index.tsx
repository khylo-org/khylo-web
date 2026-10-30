import React, { FC, useCallback, useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import BackupIcon from '@mui/icons-material/Backup';

import Page from 'components/Page';
import Loading from 'components/loading/LoadingComponent';
import ConfirmDialog from 'components/ConfirmDialog';
import SimpleAlert from 'components/SimpleAlert';

import { useBackups } from 'apps/dashboard/features/backups/api/useBackups';
import { useCreateBackup } from 'apps/dashboard/features/backups/api/useCreateBackup';
import { useRestoreBackup } from 'apps/dashboard/features/backups/api/useRestoreBackup';
import CreateBackupForm from 'apps/dashboard/features/backups/components/CreateBackupForm';
import BackupProgressDialog from 'apps/dashboard/features/backups/components/BackupProgressDialog';
import RestoreConfirmationDialog from 'apps/dashboard/features/backups/components/RestoreConfirmationDialog';
import RestoreProgressDialog from 'apps/dashboard/features/backups/components/RestoreProgressDialog';
import Backup from 'apps/dashboard/features/backups/components/Backup';
import useLiveTasks from 'apps/dashboard/features/tasks/hooks/useLiveTasks';
import { TaskState } from '@khylo/sdk/lib/generated-client/models/task-state';
import type { BackupOptionsDto } from '@khylo/sdk/lib/generated-client/models/backup-options-dto';
import type { BackupManifestDto } from '@khylo/sdk/lib/generated-client/models/backup-manifest-dto';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloStatusBadge,
    KhyloEmptyState,
    KhyloSectionPanel
} from '../../components/ui';

export const Component: FC = () => {
    const { data: backups, isPending, isError } = useBackups();
    const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
    const [backupInProgress, setBackupInProgress] = useState(false);
    const [restoreInProgress, setRestoreInProgress] = useState(false);
    const [isRestoreSuccess, setIsRestoreSuccess] = useState(false);
    const [isErrorOccurred, setIsErrorOccurred] = useState(false);
    const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
    const [backupToRestore, setBackupToRestore] = useState<BackupManifestDto | null>(null);
    const [isConfirmBackupOpen, setIsConfirmBackupOpen] = useState(false);
    const [pendingBackupOptions, setPendingBackupOptions] = useState<BackupOptionsDto | null>(null);

    const createBackup = useCreateBackup();
    const restoreBackup = useRestoreBackup();

    const { data: tasks } = useLiveTasks({ isHidden: false });

    const startBackupProcess = useCallback((backupOptions: BackupOptionsDto) => {
        setBackupInProgress(true);
        setIsCreateFormOpen(false);
        createBackup.mutate(backupOptions, {
            onError: () => setIsErrorOccurred(true),
            onSettled: () => setBackupInProgress(false)
        });
    }, [createBackup]);

    const startPendingBackup = useCallback(() => {
        setIsConfirmBackupOpen(false);
        if (pendingBackupOptions) {
            startBackupProcess(pendingBackupOptions);
        }
    }, [startBackupProcess, pendingBackupOptions]);

    const onBackupCreate = useCallback((backupOptions: BackupOptionsDto) => {
        const isTasksRunning = tasks?.some(task => task?.State !== TaskState.Idle);
        if (isTasksRunning) {
            setPendingBackupOptions(backupOptions);
            setIsCreateFormOpen(false);
            setIsConfirmBackupOpen(true);
        } else {
            startBackupProcess(backupOptions);
        }
    }, [tasks, startBackupProcess]);

    const onRestoreConfirm = useCallback(() => {
        if (!backupToRestore?.Path) return;
        setIsRestoreDialogOpen(false);
        setRestoreInProgress(true);
        restoreBackup.mutate(backupToRestore.Path, {
            onSuccess: () => setIsRestoreSuccess(true),
            onError: () => setIsErrorOccurred(true),
            onSettled: () => setRestoreInProgress(false)
        });
    }, [backupToRestore, restoreBackup]);

    const onRestoreClick = useCallback((backup: BackupManifestDto) => {
        setBackupToRestore(backup);
        setIsRestoreDialogOpen(true);
    }, []);

    const backupList = useMemo(() => backups || [], [backups]);

    if (isPending) return <Loading />;

    return (
        <Page id='backupsPage' title='Backups & Snapshots' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1080}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'System' },
                        { label: 'Backups' }
                    ]}
                    title='Database Backups & State Snapshots'
                    subtitle='Point-in-time snapshots of server databases, metadata, user configurations, and plugin states.'
                    badge={
                        <KhyloStatusBadge
                            label={`${backupList.length} Snapshots`}
                            color={backupList.length > 0 ? 'healthy' : 'idle'}
                        />
                    }
                    actions={
                        <Button
                            variant='contained'
                            size='small'
                            startIcon={<AddIcon />}
                            onClick={() => setIsCreateFormOpen(true)}
                            sx={{
                                bgcolor: KHYLO_COLORS.accent,
                                color: KHYLO_COLORS.textPrimary,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                            }}
                        >
                            Create Backup Snapshot
                        </Button>
                    }
                />

                {isError && (
                    <Alert severity='error' sx={{ mb: 3 }}>
                        Failed to retrieve available backup snapshots.
                    </Alert>
                )}

                {backupList.length === 0 ? (
                    <KhyloEmptyState
                        icon={<BackupIcon />}
                        title='No backup snapshots found'
                        description='Create a backup snapshot to preserve server configuration, users, watch progress, and library metadata.'
                        action={
                            <Button
                                variant='contained'
                                startIcon={<AddIcon />}
                                onClick={() => setIsCreateFormOpen(true)}
                                sx={{
                                    bgcolor: KHYLO_COLORS.accent,
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                                }}
                            >
                                Create First Snapshot
                            </Button>
                        }
                    />
                ) : (
                    <KhyloSectionPanel title='Saved System Snapshots' accent>
                        <List sx={{ p: 0 }}>
                            {backupList.map(item => (
                                <Box
                                    key={item.Path}
                                    sx={{
                                        '& .MuiListItem-root': {
                                            py: 1.5,
                                            borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                            '&:last-child': { borderBottom: 'none' }
                                        }
                                    }}
                                >
                                    <Backup
                                        backup={item}
                                        onRestore={onRestoreClick}
                                    />
                                </Box>
                            ))}
                        </List>
                    </KhyloSectionPanel>
                )}

                <CreateBackupForm
                    open={isCreateFormOpen}
                    onClose={() => setIsCreateFormOpen(false)}
                    onCreate={onBackupCreate}
                />

                <BackupProgressDialog
                    open={backupInProgress}
                />

                <RestoreConfirmationDialog
                    open={isRestoreDialogOpen}
                    onClose={() => setIsRestoreDialogOpen(false)}
                    onConfirm={onRestoreConfirm}
                />

                <RestoreProgressDialog
                    open={restoreInProgress}
                />

                <ConfirmDialog
                    open={isConfirmBackupOpen}
                    title='Active Background Tasks Detected'
                    text='There are active background maintenance tasks currently executing. Creating a backup snapshot during active tasks may result in minor database locks. Do you want to proceed?'
                    onCancel={() => setIsConfirmBackupOpen(false)}
                    onConfirm={startPendingBackup}
                    confirmButtonText='Proceed Anyway'
                />

                <SimpleAlert
                    open={isErrorOccurred}
                    title='Backup Error'
                    text='An error occurred during the backup or restore operation.'
                    onClose={() => setIsErrorOccurred(false)}
                />

                <SimpleAlert
                    open={isRestoreSuccess}
                    title='Restore Completed'
                    text='Backup snapshot was restored successfully. A server daemon restart is recommended.'
                    onClose={() => setIsRestoreSuccess(false)}
                />
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'BackupsPage';
export default Component;
