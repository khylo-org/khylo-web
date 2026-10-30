import React, { FC, useCallback, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { useParams, useNavigate } from 'react-router-dom';

import type { TaskTriggerInfo } from '@khylo/sdk/lib/generated-client/models/task-trigger-info';
import { TaskState } from '@khylo/sdk/lib/generated-client/models/task-state';
import { useTask } from 'apps/dashboard/features/tasks/api/useTask';
import { useStartTask } from 'apps/dashboard/features/tasks/api/useStartTask';
import { useStopTask } from 'apps/dashboard/features/tasks/api/useStopTask';
import { useUpdateTask } from 'apps/dashboard/features/tasks/api/useUpdateTask';
import ConfirmDialog from 'components/ConfirmDialog';
import NewTriggerForm from 'apps/dashboard/features/tasks/components/NewTriggerForm';
import { getTriggerFriendlyName } from 'apps/dashboard/features/tasks/utils/edit';
import { useLocale } from 'hooks/useLocale';
import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloPanel,
    KhyloStatusBadge,
    KhyloMetricRow,
    KhyloEmptyState
} from '../../components/ui';

export const Component: FC = () => {
    const { id: taskId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { dateFnsLocale } = useLocale();

    const { data: task, isLoading, isError } = useTask({ taskId: taskId || '' });
    const updateTask = useUpdateTask();
    const startTask = useStartTask();
    const stopTask = useStopTask();

    const [isBusy, setIsBusy] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'error'>('success');
    const [isAddTriggerDialogOpen, setIsAddTriggerDialogOpen] = useState(false);
    const [pendingDeleteTrigger, setPendingDeleteTrigger] = useState<TaskTriggerInfo | null>(null);

    const triggers = useMemo(() => task?.Triggers || [], [task]);
    const isRunning = task?.State === TaskState.Running;
    const isFailed = task?.LastExecutionResult?.Status === 'Failed';
    const statusColor = isRunning ? 'active' : isFailed ? 'failed' : 'idle';
    const statusLabel = isRunning ? 'Running' : isFailed ? 'Failed' : 'Idle';

    const duration = useMemo(() => {
        const start = task?.LastExecutionResult?.StartTimeUtc;
        const end = task?.LastExecutionResult?.EndTimeUtc;
        if (start && end) {
            const diffMs = new Date(end).getTime() - new Date(start).getTime();
            const secs = Math.max(0, Math.round(diffMs / 1000));
            if (secs < 60) return `${secs}s`;
            const mins = Math.floor(secs / 60);
            return `${mins}m ${secs % 60}s`;
        }
        return '—';
    }, [task?.LastExecutionResult]);

    const handleExecuteNow = useCallback(() => {
        if (!task?.Id) return;
        setIsBusy(true);
        startTask.mutate({ taskId: task.Id }, {
            onSuccess: () => {
                setToastSeverity('success');
                setToastMessage(`Started task: "${task.Name || 'Task'}"`);
            },
            onError: (err) => {
                console.error('[TaskDetailPage] Start task error:', err);
                setToastSeverity('error');
                setToastMessage(`Failed to execute task "${task.Name || 'Task'}".`);
            },
            onSettled: () => setIsBusy(false)
        });
    }, [task, startTask]);

    const handleStopTask = useCallback(() => {
        if (!task?.Id) return;
        setIsBusy(true);
        stopTask.mutate({ taskId: task.Id }, {
            onSuccess: () => {
                setToastSeverity('info');
                setToastMessage(`Cancelled task: "${task.Name || 'Task'}"`);
            },
            onError: (err) => {
                console.error('[TaskDetailPage] Stop task error:', err);
                setToastSeverity('error');
                setToastMessage(`Failed to stop task.`);
            },
            onSettled: () => setIsBusy(false)
        });
    }, [task, stopTask]);

    const handleConfirmDelete = useCallback(() => {
        if (!task?.Id || !pendingDeleteTrigger) return;
        const remaining = task.Triggers?.filter((t) => t !== pendingDeleteTrigger) || [];
        updateTask.mutate({
            taskId: task.Id,
            taskTriggerInfo: remaining
        });
        setPendingDeleteTrigger(null);
    }, [task, pendingDeleteTrigger, updateTask]);

    const handleAddTrigger = useCallback((trigger: TaskTriggerInfo) => {
        if (!task?.Id) return;
        const updated = [...(task.Triggers || []), trigger];
        updateTask.mutate({
            taskId: task.Id,
            taskTriggerInfo: updated
        });
        setIsAddTriggerDialogOpen(false);
    }, [task, updateTask]);

    if (isLoading) {
        return (
            <KhyloPage>
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress size={32} sx={{ color: KHYLO_COLORS.accent }} />
                </Box>
            </KhyloPage>
        );
    }

    if (isError || !task) {
        return (
            <KhyloPage>
                <Alert severity='error' sx={{ mb: 3 }}>
                    Failed to load scheduled task details.
                </Alert>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/dashboard/tasks')}
                    sx={{ textTransform: 'none', color: KHYLO_COLORS.accent }}
                >
                    Back to Scheduled Tasks
                </Button>
            </KhyloPage>
        );
    }

    return (
        <KhyloPage>
            <ConfirmDialog
                open={Boolean(pendingDeleteTrigger)}
                title='Remove Trigger'
                text='Are you sure you want to remove this execution trigger from the scheduled job schedule?'
                onCancel={() => setPendingDeleteTrigger(null)}
                onConfirm={handleConfirmDelete}
                confirmButtonColor='error'
                confirmButtonText='Remove'
            />

            <NewTriggerForm
                open={isAddTriggerDialogOpen}
                title='Add Execution Trigger'
                onClose={() => setIsAddTriggerDialogOpen(false)}
                onAdd={handleAddTrigger}
            />

            <KhyloPageHeader
                breadcrumbs={[
                    { label: 'Server' },
                    { label: 'Automation' },
                    { label: 'Scheduled Tasks', href: '/dashboard/tasks' },
                    { label: task.Name || 'Task' }
                ]}
                title={task.Name || 'Scheduled Task'}
                subtitle={task.Description || 'Automated maintenance, library refresh, or telemetry cron task.'}
                badge={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <KhyloStatusBadge
                            label={statusLabel}
                            color={statusColor}
                        />
                        <KhyloStatusBadge
                            label={task.Category || 'System'}
                            color='idle'
                        />
                        <KhyloStatusBadge
                            label={`${triggers.length} ${triggers.length === 1 ? 'Trigger' : 'Triggers'}`}
                            color={triggers.length > 0 ? 'healthy' : 'warning'}
                        />
                    </Box>
                }
                actions={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                            size='small'
                            variant='outlined'
                            startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
                            onClick={() => navigate('/dashboard/tasks')}
                            sx={{
                                textTransform: 'none',
                                borderColor: KHYLO_COLORS.borderDefault,
                                color: KHYLO_COLORS.textSecondary,
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                '&:hover': { color: KHYLO_COLORS.textPrimary }
                            }}
                        >
                            All Tasks
                        </Button>

                        {isRunning ? (
                            <Button
                                size='small'
                                variant='outlined'
                                color='error'
                                disabled={isBusy}
                                startIcon={<StopIcon />}
                                onClick={handleStopTask}
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.82rem' }}
                            >
                                {isBusy ? 'Stopping…' : 'Stop Task'}
                            </Button>
                        ) : (
                            <Button
                                size='small'
                                variant='contained'
                                disabled={isBusy}
                                startIcon={<PlayArrowIcon />}
                                onClick={handleExecuteNow}
                                sx={{
                                    textTransform: 'none',
                                    bgcolor: KHYLO_COLORS.accent,
                                    color: '#FFFFFF',
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                                }}
                            >
                                {isBusy ? 'Starting…' : 'Execute Now'}
                            </Button>
                        )}

                        <Button
                            size='small'
                            variant='outlined'
                            startIcon={<AddIcon />}
                            onClick={() => setIsAddTriggerDialogOpen(true)}
                            sx={{
                                textTransform: 'none',
                                borderColor: KHYLO_COLORS.borderDefault,
                                color: KHYLO_COLORS.textPrimary,
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                '&:hover': { borderColor: KHYLO_COLORS.accent }
                            }}
                        >
                            Add Trigger
                        </Button>
                    </Box>
                }
            />

            {/* Live Operational Status Strip */}
            <KhyloPanel
                title='Job Execution Telemetry & Status'
                sx={{ mb: 3 }}
            >
                <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                                State:
                            </Typography>
                            <KhyloStatusBadge label={statusLabel} color={statusColor} />
                            {task.CurrentProgressPercentage != null && isRunning && (
                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.accent, fontWeight: 700, fontFamily: 'monospace' }}>
                                    {Math.round(task.CurrentProgressPercentage)}%
                                </Typography>
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {isRunning ? (
                                <Button
                                    size='small'
                                    variant='outlined'
                                    color='error'
                                    disabled={isBusy}
                                    startIcon={<StopIcon />}
                                    onClick={handleStopTask}
                                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' }}
                                >
                                    Cancel Execution
                                </Button>
                            ) : (
                                <Button
                                    size='small'
                                    variant='contained'
                                    disabled={isBusy}
                                    startIcon={<PlayArrowIcon />}
                                    onClick={handleExecuteNow}
                                    sx={{
                                        textTransform: 'none',
                                        bgcolor: KHYLO_COLORS.accent,
                                        fontWeight: 600,
                                        fontSize: '0.78rem',
                                        '&:hover': { bgcolor: KHYLO_COLORS.accentHover }
                                    }}
                                >
                                    Run Now
                                </Button>
                            )}
                        </Box>
                    </Box>

                    {isRunning && (
                        <Box>
                            <LinearProgress
                                variant={task.CurrentProgressPercentage != null ? 'determinate' : 'indeterminate'}
                                value={task.CurrentProgressPercentage ?? 0}
                                sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: KHYLO_COLORS.surfaceSecondary,
                                    '& .MuiLinearProgress-bar': { bgcolor: KHYLO_COLORS.accent }
                                }}
                            />
                        </Box>
                    )}

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, pt: 1 }}>
                        <KhyloMetricRow
                            label='Last Finished'
                            value={task.LastExecutionResult?.EndTimeUtc ? new Date(task.LastExecutionResult.EndTimeUtc).toLocaleString() : 'Never'}
                            muted
                        />
                        <KhyloMetricRow
                            label='Run Duration'
                            value={duration}
                            muted
                        />
                        <KhyloMetricRow
                            label='Trigger Schedules'
                            value={triggers.length > 0 ? `${triggers.length} configured trigger(s)` : 'Manual Trigger Only'}
                            muted
                        />
                        <KhyloMetricRow
                            label='Last Status'
                            value={task.LastExecutionResult?.Status || 'None'}
                            muted
                        />
                    </Box>

                    {task.LastExecutionResult?.ErrorMessage && (
                        <Alert severity='error' sx={{ mt: 1 }}>
                            {task.LastExecutionResult.ErrorMessage}
                        </Alert>
                    )}
                </Stack>
            </KhyloPanel>

            <KhyloPanel sx={{ p: 0, overflow: 'hidden' }}>
                <Box
                    sx={{
                        px: 3,
                        py: 2,
                        borderBottom: `1px solid ${KHYLO_COLORS.borderDefault}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: KHYLO_COLORS.surfaceSecondary
                    }}
                >
                    <Box>
                        <Typography variant='subtitle2' sx={{ fontWeight: 700, color: KHYLO_COLORS.textPrimary }}>
                            Configured Execution Schedules
                        </Typography>
                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
                            Triggers define intervals, calendar times, or system events that activate this background task.
                        </Typography>
                    </Box>
                </Box>

                {triggers.length === 0 ? (
                    <Box sx={{ p: 4 }}>
                        <KhyloEmptyState
                            icon={<ScheduleIcon />}
                            title='No Automated Triggers Defined'
                            description='This task will only execute when manually triggered from the tasks dashboard.'
                            action={
                                <Button
                                    variant='contained'
                                    size='small'
                                    startIcon={<AddIcon />}
                                    onClick={() => setIsAddTriggerDialogOpen(true)}
                                    sx={{ textTransform: 'none', bgcolor: KHYLO_COLORS.accent, '&:hover': { bgcolor: KHYLO_COLORS.accentHover } }}
                                >
                                    Define First Trigger
                                </Button>
                            }
                        />
                    </Box>
                ) : (
                    <Box sx={{ divideY: `1px solid ${KHYLO_COLORS.borderSubtle}` }}>
                        {triggers.map((trigger, idx) => {
                            const friendlyName = getTriggerFriendlyName(trigger, dateFnsLocale);
                            const timeLimitHours = trigger.MaxRuntimeTicks ? trigger.MaxRuntimeTicks / 36e9 : null;

                            return (
                                <Box
                                    key={idx}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        px: 3,
                                        py: 2,
                                        transition: 'background-color 0.15s ease',
                                        '&:hover': { bgcolor: KHYLO_COLORS.surfaceHover }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Box
                                            sx={{
                                                width: 34,
                                                height: 34,
                                                borderRadius: '6px',
                                                bgcolor: KHYLO_COLORS.surfaceSecondary,
                                                border: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: KHYLO_COLORS.accent,
                                                flexShrink: 0
                                            }}
                                        >
                                            <ScheduleIcon sx={{ fontSize: 18 }} />
                                        </Box>
                                        <Box>
                                            <Typography variant='body2' sx={{ fontWeight: 600, color: KHYLO_COLORS.textPrimary }}>
                                                {friendlyName}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                                                <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted, fontFamily: 'monospace' }}>
                                                    Type: {trigger.Type || 'Unknown'}
                                                </Typography>
                                                {timeLimitHours && (
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <HourglassEmptyIcon sx={{ fontSize: 13, color: KHYLO_COLORS.textMuted }} />
                                                        <Typography variant='caption' sx={{ color: KHYLO_COLORS.textMuted }}>
                                                             Max Limit: {timeLimitHours}h
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>

                                    <Tooltip title='Remove Trigger'>
                                        <IconButton
                                            size='small'
                                            onClick={() => setPendingDeleteTrigger(trigger)}
                                            sx={{
                                                color: KHYLO_COLORS.textMuted,
                                                '&:hover': { color: KHYLO_COLORS.status.danger.fg, bgcolor: 'rgba(239, 68, 68, 0.1)' }
                                            }}
                                        >
                                            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </KhyloPanel>

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
        </KhyloPage>
    );
};

export default Component;
