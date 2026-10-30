import React, { type FC, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { KHYLO_COLORS } from './tokens';

interface KhyloSettingSectionProps {
    /** Title of the configuration section */
    title: string;
    /** Concise technical context for this group of settings */
    description?: string;
    /** Action trigger on the section header (e.g. Test, Refresh, Reset) */
    action?: ReactNode;
    /** List of KhyloSettingRow or custom controls */
    children: ReactNode;
}

/**
 * Grouped settings container.
 * Groups related settings together with clear boundaries and header context.
 */
export const KhyloSettingSection: FC<KhyloSettingSectionProps> = ({
    title,
    description,
    action,
    children
}) => {
    return (
        <Paper
            variant='outlined'
            sx={{
                mb: 3,
                borderRadius: '8px',
                borderColor: KHYLO_COLORS.borderDefault,
                bgcolor: KHYLO_COLORS.surfacePrimary,
                overflow: 'hidden'
            }}
        >
            <Box
                sx={{
                    px: 2.5,
                    py: 1.75,
                    borderBottom: `1px solid ${KHYLO_COLORS.borderDefault}`,
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1
                }}
            >
                <Box>
                    <Typography
                        variant='subtitle2'
                        sx={{
                            fontWeight: 700,
                            color: KHYLO_COLORS.textPrimary,
                            letterSpacing: '0.02em',
                            fontSize: '0.9rem',
                            textTransform: 'uppercase'
                        }}
                    >
                        {title}
                    </Typography>
                    {description && (
                        <Typography
                            variant='caption'
                            sx={{
                                color: KHYLO_COLORS.textSecondary,
                                display: 'block',
                                mt: 0.25,
                                fontSize: '0.78rem'
                            }}
                        >
                            {description}
                        </Typography>
                    )}
                </Box>
                {action && <Box>{action}</Box>}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {children}
            </Box>
        </Paper>
    );
};

export default KhyloSettingSection;
