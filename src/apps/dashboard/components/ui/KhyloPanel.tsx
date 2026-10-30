import React, { type FC, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { KHYLO_COLORS } from './tokens';

interface KhyloPanelProps {
    title?: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    /** Whether to add standard inner padding (default: true) */
    padded?: boolean;
    sx?: object;
}

/**
 * Standard Khylo surface panel.
 * Replaces generic cards with a clean, border-defined technical surface.
 */
export const KhyloPanel: FC<KhyloPanelProps> = ({
    title,
    subtitle,
    actions,
    children,
    padded = true,
    sx
}) => {
    return (
        <Paper
            variant='outlined'
            sx={{
                borderRadius: '8px',
                borderColor: KHYLO_COLORS.borderDefault,
                bgcolor: KHYLO_COLORS.surfacePrimary,
                overflow: 'hidden',
                ...sx
            }}
        >
            {(title || actions) && (
                <Box
                    sx={{
                        px: 2.5,
                        py: 1.5,
                        borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                        display: 'flex',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 1
                    }}
                >
                    <Box>
                        {typeof title === 'string' ? (
                            <Typography
                                variant='subtitle2'
                                sx={{
                                    fontWeight: 700,
                                    color: KHYLO_COLORS.textPrimary,
                                    fontSize: '0.875rem'
                                }}
                            >
                                {title}
                            </Typography>
                        ) : (
                            title
                        )}
                        {subtitle && (
                            <Typography
                                variant='caption'
                                sx={{
                                    display: 'block',
                                    color: KHYLO_COLORS.textSecondary,
                                    fontSize: '0.78rem',
                                    mt: 0.25
                                }}
                            >
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    {actions && <Box>{actions}</Box>}
                </Box>
            )}

            <Box sx={{ p: padded ? 2.5 : 0 }}>
                {children}
            </Box>
        </Paper>
    );
};

export default KhyloPanel;
