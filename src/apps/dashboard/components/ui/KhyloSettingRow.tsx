import React, { type FC, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { KHYLO_COLORS } from './tokens';

interface KhyloSettingRowProps {
    /** Title of the setting */
    title?: string;
    /** Alternative label alias */
    label?: string;
    /** Technical explanation of what this setting controls */
    description?: ReactNode;
    /** The interactive control (Switch, Select, Input, Slider, etc.) */
    control?: ReactNode;
    /** Children passed as the control */
    children?: ReactNode;
    /** Visually indicate this setting is dependent on another (indents slightly) */
    isDependent?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Optional badge or tag next to title */
    badge?: ReactNode;
}

/**
 * Two-column operational setting row.
 * Eliminates the giant full-width textbox + paragraph underneath anti-pattern.
 * Left: Concise label + technical description.
 * Right: Compact, aligned control.
 */
export const KhyloSettingRow: FC<KhyloSettingRowProps> = ({
    title,
    label,
    description,
    control,
    children,
    isDependent = false,
    disabled = false,
    badge
}) => {
    const rowTitle = title || label || '';
    const rowControl = control ?? children;

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 2,
                py: 1.75,
                px: 2.5,
                pl: isDependent ? { xs: 2.5, sm: 5 } : 2.5,
                borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
                opacity: disabled ? 0.45 : 1,
                pointerEvents: disabled ? 'none' : 'auto',
                transition: 'background-color 0.15s ease',
                '&:hover': {
                    bgcolor: KHYLO_COLORS.surfaceHover
                },
                '&:last-child': {
                    borderBottom: 'none'
                }
            }}
        >
            <Box sx={{ maxWidth: { xs: '100%', sm: '58%' }, pr: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Typography
                        variant='body2'
                        sx={{
                            fontWeight: 600,
                            color: KHYLO_COLORS.textPrimary,
                            fontSize: '0.875rem'
                        }}
                    >
                        {rowTitle}
                    </Typography>
                    {badge}
                </Box>
                {description && (
                    <Typography
                        variant='caption'
                        sx={{
                            display: 'block',
                            color: KHYLO_COLORS.textSecondary,
                            fontSize: '0.78rem',
                            lineHeight: 1.45
                        }}
                    >
                        {description}
                    </Typography>
                )}
            </Box>

            <Box
                sx={{
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: { sm: 200 },
                    display: 'flex',
                    justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                    alignItems: 'center',
                    flexShrink: 0
                }}
            >
                {rowControl}
            </Box>
        </Box>
    );
};

export default KhyloSettingRow;
