import React, { type FC, type ReactNode } from 'react';
import Box from '@mui/material/Box';

interface KhyloPageProps {
    children: ReactNode;
    /** Optional: constrain max-width for content-heavy pages */
    maxWidth?: number | string;
    /** Optional: additional className */
    className?: string;
}

/**
 * Root page shell for all Khylo admin pages.
 * Provides consistent padding, max-width, and layout behavior.
 */
const KhyloPage: FC<KhyloPageProps> = ({ children, maxWidth, className }) => (
    <Box
        className={className}
        sx={{
            px: { xs: 2, md: 3 },
            py: 3,
            maxWidth: maxWidth ?? '100%',
            width: '100%',
            boxSizing: 'border-box'
        }}
    >
        {children}
    </Box>
);

export default KhyloPage;
