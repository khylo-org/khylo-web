import React, { type FC } from 'react';
import Chip from '@mui/material/Chip';

export type KhyloStatusColor = 'healthy' | 'degraded' | 'warning' | 'failed' | 'danger' | 'idle' | 'active' | 'scanning' | 'unknown' | 'info';

interface KhyloStatusBadgeProps {
    label: string;
    color: KhyloStatusColor;
    size?: 'small' | 'medium';
}

const COLORS: Record<KhyloStatusColor, { bg: string; fg: string; border: string }> = {
    healthy: { bg: 'rgba(52, 211, 153, 0.12)', fg: '#34D399', border: 'rgba(52, 211, 153, 0.3)' },
    degraded: { bg: 'rgba(245, 158, 11, 0.12)', fg: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', fg: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
    failed: { bg: 'rgba(239, 68, 68, 0.12)', fg: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
    danger: { bg: 'rgba(239, 68, 68, 0.12)', fg: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
    idle: { bg: 'rgba(148, 163, 184, 0.10)', fg: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' },
    active: { bg: 'rgba(56, 189, 248, 0.12)', fg: '#38BDF8', border: 'rgba(56, 189, 248, 0.3)' },
    info: { bg: 'rgba(56, 189, 248, 0.12)', fg: '#38BDF8', border: 'rgba(56, 189, 248, 0.3)' },
    scanning: { bg: 'rgba(217, 119, 50, 0.12)', fg: '#D97732', border: 'rgba(217, 119, 50, 0.3)' },
    unknown: { bg: 'rgba(148, 163, 184, 0.08)', fg: '#94A3B8', border: 'rgba(148, 163, 184, 0.2)' },
};

export const KhyloStatusBadge: FC<KhyloStatusBadgeProps> = ({ label, color, size = 'small' }) => {
    const c = COLORS[color] || COLORS.idle;
    return (
        <Chip
            label={label}
            size={size}
            sx={{
                backgroundColor: c.bg,
                color: c.fg,
                border: `1px solid ${c.border}`,
                fontWeight: 600,
                fontSize: size === 'small' ? '0.72rem' : '0.78rem',
                height: size === 'small' ? 22 : 26
            }}
        />
    );
};

export default KhyloStatusBadge;
