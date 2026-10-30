import React, { type FC, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

interface KhyloSectionPanelProps {
    title: string;
    children: ReactNode;
    actions?: ReactNode;
    /** Show a left accent bar (used to visually group related panels) */
    accent?: boolean;
}

/**
 * A labeled section panel for grouping related configuration or data.
 * Replaces the generic Khylo card/widget pattern.
 */
const KhyloSectionPanel: FC<KhyloSectionPanelProps> = ({ title, children, actions, accent }) => (
    <Paper
        variant='outlined'
        sx={{
            borderRadius: 2,
            overflow: 'hidden',
            borderLeft: accent ? '3px solid #D97732' : undefined
        }}
    >
        <Box
            sx={{
                px: 2.5,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}
        >
            <Typography
                variant='overline'
                sx={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'text.secondary', lineHeight: 1 }}
            >
                {title}
            </Typography>
            {actions && <Stack direction='row' gap={1}>{actions}</Stack>}
        </Box>
        <Box sx={{ p: 2.5 }}>
            {children}
        </Box>
    </Paper>
);

export default KhyloSectionPanel;
