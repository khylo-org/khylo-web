import React, { useCallback, useMemo, useState, FC } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TuneIcon from '@mui/icons-material/Tune';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Link as RouterLink } from 'react-router-dom';

import Page from 'components/Page';
import Loading from 'components/loading/LoadingComponent';

import { getCategories, getTasksByCategory } from '../../features/tasks/utils/tasks';
import useLiveTasks from 'apps/dashboard/features/tasks/hooks/useLiveTasks';
import { useStartTask } from 'apps/dashboard/features/tasks/api/useStartTask';
import { useStopTask } from 'apps/dashboard/features/tasks/api/useStopTask';
import { TaskState } from '@khylo/sdk/lib/generated-client/models/task-state';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloSectionPanel,
    KhyloStatusBadge,
    KhyloMetricRow,
    KhyloEmptyState
} from '../../components/ui';

interface TaskItemProps {
    task: any;
    onStart: (id: string, name: string) => void;
    onStop: (id: string, name: string) => void;
    isBusy?: boolean;
}

const TaskItem: FC<TaskItemProps> = ({ task, onStart, onStop, isBusy }) => {
    const isRunning = task.State === TaskState.Running;
    const isFailed = task.LastExecutionResult?.Status === 'Failed';
    const statusColor = isRunning ? 'active' : isFailed ? 'failed' : 'idle';
    const statusLabel = isRunning ? 'Running' : isFailed ? 'Failed' : 'Idle';

    return (
        <Paper
            variant='outlined'
            sx={{
                p: 2.25,
                borderRadius: '8px',
                bgcolor: KHYLO_COLORS.surfacePrimary,
                borderColor: isRunning ? KHYLO_COLORS.accent : KHYLO_COLORS.borderSubtle,
                transition: 'border-color 0.2s ease'
            }}
        >
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'flex-start' }} gap={2}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction='row' alignItems='center' gap={1.5} mb={0.75}>
                        <Typography variant='body1' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                            {task.Name}
                        </Typography>
                        <KhyloStatusBadge label={statusLabel} color={statusColor} />
                    </Stack>
                    <Typography variant='body2' sx={{ color: KHYLO_COLORS.textMuted, mb: 2, fontSize: '0.82rem', lineHeight: 1.4 }}>
                        {task.Description || 'No description provided.'}
                    </Typography>

                    {isRunning && (
                        <Box sx={{ mb: 2, maxWidth: 500 }}>
                            <Stack direction='row' justifyContent='space-between' mb={0.5}>
                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textSecondary }}>Job Execution Progress</Typography>
                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.accent, fontWeight: 600 }}>
                                    {Math.round(task.CurrentProgressPercentage ?? 0)}%
                                </Typography>
                            </Stack>
                            <LinearProgress
                                variant={task.CurrentProgressPercentage != null ? 'determinate' : 'indeterminate'}
                                value={task.CurrentProgressPercentage ?? 0}
                                sx={{
                                    height: 5,
                                    borderRadius: 3,
                                    bgcolor: KHYLO_COLORS.surfaceSecondary,
                                    '& .MuiLinearProgress-bar': {
                                        bgcolor: KHYLO_COLORS.accent
                                    }
                                }}
                            />
                        </Box>
                    )}

                    <Stack spacing={0.5} sx={{ maxWidth: 460 }}>
                        <KhyloMetricRow
                            label='Last Executed'
                            value={task.LastExecutionResult?.EndTimeUtc ? new Date(task.LastExecutionResult.EndTimeUtc).toLocaleString() : 'Never'}
                            muted
                        />
                        <KhyloMetricRow
                            label='Run Duration'
                            value={task.LastExecutionResult?.Duration || '—'}
                            muted
                        />
                        <KhyloMetricRow
                            label='Next Trigger'
                            value={task.NextExecutionTime ? new Date(task.NextExecutionTime).toLocaleString() : 'Manual Trigger Only'}
                            muted
                        />
                    </Stack>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, pt: { xs: 1, md: 0 } }}>
                    <RouterLink to={`/dashboard/tasks/${task.Id}`} style={{ textDecoration: 'none' }}>
                        <Button
                            variant='outlined'
                            size='small'
                            startIcon={<TuneIcon sx={{ fontSize: 15 }} />}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                borderColor: KHYLO_COLORS.borderDefault,
                                color: KHYLO_COLORS.textSecondary,
                                '&:hover': { color: KHYLO_COLORS.textPrimary, borderColor: KHYLO_COLORS.accent }
                            }}
                        >
                            Configure
                        </Button>
                    </RouterLink>
                    {isRunning ? (
                        <Button
                            variant='outlined'
                            color='error'
                            size='small'
                            disabled={isBusy}
                            startIcon={<StopIcon />}
                            onClick={() => onStop(task.Id, task.Name)}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                        >
                            {isBusy ? 'Stopping…' : 'Stop Task'}
                        </Button>
                    ) : (
                        <Button
                            variant='contained'
                            size='small'
                            disabled={isBusy}
                            startIcon={<PlayArrowIcon />}
                            onClick={() => onStart(task.Id, task.Name)}
                            sx={{
                                bgcolor: KHYLO_COLORS.accent,
                                color: '#FFFFFF',
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                            }}
                        >
                            {isBusy ? 'Starting…' : 'Execute Now'}
                        </Button>
                    )}
                </Box>
            </Stack>
        </Paper>
    );
};

export const Component: FC = () => {
    const { data: tasks, isPending, refetch } = useLiveTasks({ isHidden: false });
    const startTask = useStartTask();
    const stopTask = useStopTask();

    const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'error'>('success');

    const handleStart = useCallback((id: string, name: string) => {
        setBusyTaskId(id);
        startTask.mutate({ taskId: id }, {
            onSuccess: () => {
                setToastSeverity('success');
                setToastMessage(`Started task: "${name}"`);
            },
            onError: (err) => {
                console.error('[TasksPage] Start task error:', err);
                setToastSeverity('error');
                setToastMessage(`Failed to start task "${name}".`);
            },
            onSettled: () => {
                setBusyTaskId(null);
            }
        });
    }, [startTask]);

    const handleStop = useCallback((id: string, name: string) => {
        setBusyTaskId(id);
        stopTask.mutate({ taskId: id }, {
            onSuccess: () => {
                setToastSeverity('info');
                setToastMessage(`Cancelled task: "${name}"`);
            },
            onError: (err) => {
                console.error('[TasksPage] Stop task error:', err);
                setToastSeverity('error');
                setToastMessage(`Failed to stop task "${name}".`);
            },
            onSettled: () => {
                setBusyTaskId(null);
            }
        });
    }, [stopTask]);

    const categories = useMemo(() => (tasks ? getCategories(tasks) : []), [tasks]);

    const runningTasksCount = useMemo(() => {
        if (!tasks) return 0;
        return tasks.filter(t => t.State === TaskState.Running).length;
    }, [tasks]);

    if (isPending) return <Loading />;

    return (
        <Page id='scheduledTasksPage' title='Scheduled Tasks' className='mainAnimatedPage type-interior'>
            <KhyloPage maxWidth={1080}>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Automation' },
                        { label: 'Scheduled Tasks' }
                    ]}
                    title='Scheduled Maintenance Tasks'
                    subtitle='Automated background jobs, library integrity scans, metadata synchronization, and system pruning routines.'
                    badge={
                        <KhyloStatusBadge
                            label={runningTasksCount > 0 ? `${runningTasksCount} Running • ${tasks?.length || 0} Total` : `${tasks?.length || 0} Total Jobs`}
                            color={runningTasksCount > 0 ? 'active' : 'idle'}
                        />
                    }
                    actions={
                        <Button
                            size='small'
                            variant='outlined'
                            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
                            onClick={() => void refetch()}
                            sx={{
                                textTransform: 'none',
                                borderColor: KHYLO_COLORS.borderDefault,
                                color: KHYLO_COLORS.textSecondary,
                                fontWeight: 600,
                                '&:hover': { color: KHYLO_COLORS.textPrimary, borderColor: KHYLO_COLORS.accent }
                            }}
                        >
                            Refresh
                        </Button>
                    }
                />

                {!tasks?.length ? (
                    <KhyloEmptyState
                        icon={<ScheduleIcon />}
                        title='No scheduled tasks registered'
                        description='There are currently no background maintenance tasks registered on this server.'
                    />
                ) : (
                    <Stack spacing={3}>
                        {categories.map(category => {
                            const categoryTasks = getTasksByCategory(tasks, category);
                            return (
                                <KhyloSectionPanel key={category} title={category} accent>
                                    <Stack spacing={1.75}>
                                        {categoryTasks.map(task => (
                                            <TaskItem
                                                key={task.Id}
                                                task={task}
                                                isBusy={busyTaskId === task.Id}
                                                onStart={handleStart}
                                                onStop={handleStop}
                                            />
                                        ))}
                                    </Stack>
                                </KhyloSectionPanel>
                            );
                        })}
                    </Stack>
                )}
            </KhyloPage>

            <Snackbar
                open={Boolean(toastMessage)}
                autoHideDuration={4000}
                onClose={() => setToastMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={toastSeverity}
                    onClose={() => setToastMessage(null)}
                    sx={{ bgcolor: KHYLO_COLORS.surfaceElevated, color: KHYLO_COLORS.textPrimary }}
                >
                    {toastMessage}
                </Alert>
            </Snackbar>
        </Page>
    );
};

Component.displayName = 'TasksPage';
export default Component;
