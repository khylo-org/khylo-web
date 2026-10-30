import React, { type FC, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

interface KhyloResourceHeaderProps {
    /** Primary resource name */
    title: string;
    /** Resource type label (e.g. "Movies Library", "User Account") */
    resourceType?: string;
    /** Status indicator */
    status?: {
        label: string;
        color: 'healthy' | 'degraded' | 'failed' | 'idle' | 'active';
    };
    /** Secondary detail line (e.g. "3 locations · last scanned 2h ago") */
    detail?: string;
    /** Action buttons (right side) */
    actions?: ReactNode;
}

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    healthy: { bg: 'rgba(63, 125, 88, 0.12)', color: '#3F7D58', border: 'rgba(63, 125, 88, 0.3)' },
    degraded: { bg: 'rgba(217, 119, 50, 0.12)', color: '#D97732', border: 'rgba(217, 119, 50, 0.3)' },
    failed: { bg: 'rgba(220, 38, 38, 0.12)', color: '#DC2626', border: 'rgba(220, 38, 38, 0.3)' },
    idle: { bg: 'rgba(100, 116, 139, 0.12)', color: '#64748B', border: 'rgba(100, 116, 139, 0.3)' },
    active: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
};

/**
 * Standardized resource identity header for all Khylo admin detail views.
 * Shows: resource name, type, status, detail, and actions.
 */
const KhyloResourceHeader: FC<KhyloResourceHeaderProps> = ({
    title, resourceType, status, detail, actions
}) => {
    const statusColors = status ? STATUS_COLORS[status.color] : null;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                pb: 2.5,
                mb: 3,
                borderBottom: '1px solid',
                borderColor: 'divider'
            }}
        >
            <Stack spacing={0.5}>
                {resourceType && (
                    <Typography
                        variant='overline'
                        sx={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.disabled', lineHeight: 1 }}
                    >
                        {resourceType}
                    </Typography>
                )}
                <Stack direction='row' alignItems='center' gap={1.5} flexWrap='wrap'>
                    <Typography variant='h5' component='h1' sx={{ fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                        {title}
                    </Typography>
                    {status && statusColors && (
                        <Chip
                            label={status.label}
                            size='small'
                            sx={{
                                height: 22,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                backgroundColor: statusColors.bg,
                                color: statusColors.color,
                                border: `1px solid ${statusColors.border}`
                            }}
                        />
                    )}
                </Stack>
                {detail && (
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.25 }}>
                        {detail}
                    </Typography>
                )}
            </Stack>
            {actions && (
                <Stack direction='row' gap={1} flexWrap='wrap'>
                    {actions}
                </Stack>
            )}
        </Box>
    );
};

export default KhyloResourceHeader;
