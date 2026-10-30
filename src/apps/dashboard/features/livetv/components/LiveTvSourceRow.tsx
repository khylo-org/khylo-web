import React, { type FC, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { KHYLO_COLORS } from '../../../components/ui';

interface LiveTvSourceRowProps {
    icon: ReactNode;
    title: string;
    kind: string;
    detail?: string;
    actions: ReactNode;
}

/** One tuner or guide source in the Live TV admin list. */
const LiveTvSourceRow: FC<LiveTvSourceRowProps> = ({ icon, title, kind, detail, actions }) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2.5,
            py: 1.75,
            borderBottom: `1px solid ${KHYLO_COLORS.borderSubtle}`,
            '&:last-child': { borderBottom: 'none' },
            '&:hover': { bgcolor: KHYLO_COLORS.surfaceHover },
            flexWrap: { xs: 'wrap', sm: 'nowrap' }
        }}
    >
        <Box
            sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                bgcolor: KHYLO_COLORS.accentMuted,
                color: KHYLO_COLORS.accent
            }}
        >
            {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: KHYLO_COLORS.textPrimary }}>{title}</Typography>
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: KHYLO_COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {kind}
                </Typography>
            </Box>
            {detail && (
                <Typography
                    sx={{
                        mt: 0.25,
                        fontSize: '0.78rem',
                        color: KHYLO_COLORS.textSecondary,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {detail}
                </Typography>
            )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>{actions}</Box>
    </Box>
);

export default LiveTvSourceRow;
