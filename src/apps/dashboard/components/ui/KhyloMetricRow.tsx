import React, { type FC, type ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface KhyloMetricRowProps {
    label: string;
    value: ReactNode;
    muted?: boolean;
}

/** A single label → value row used in detail panels and data sections. */
const KhyloMetricRow: FC<KhyloMetricRowProps> = ({ label, value, muted }) => (
    <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
        <Typography
            variant='body2'
            sx={{ color: 'text.secondary', fontSize: '0.82rem', flexShrink: 0, mr: 2 }}
        >
            {label}
        </Typography>
        <Typography
            variant='body2'
            sx={{
                fontWeight: muted ? 400 : 600,
                color: muted ? 'text.disabled' : 'text.primary',
                fontSize: '0.82rem',
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right'
            }}
        >
            {value}
        </Typography>
    </Stack>
);

export default KhyloMetricRow;
