import React, { type FC, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface KhyloEmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

/** Empty state display — no data, no results, no items configured. */
const KhyloEmptyState: FC<KhyloEmptyStateProps> = ({ icon, title, description, action }) => (
    <Box
        sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
            gap: 1.5,
            textAlign: 'center'
        }}
    >
        {icon && (
            <Box sx={{ color: 'text.disabled', mb: 0.5, '& svg': { fontSize: 48 } }}>
                {icon}
            </Box>
        )}
        <Typography variant='h6' sx={{ fontWeight: 600, color: 'text.primary', fontSize: '1rem' }}>
            {title}
        </Typography>
        {description && (
            <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 360 }}>
                {description}
            </Typography>
        )}
        {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
);

export default KhyloEmptyState;
