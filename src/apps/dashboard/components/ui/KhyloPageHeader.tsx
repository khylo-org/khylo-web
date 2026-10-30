import React, { type FC, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link as RouterLink } from 'react-router-dom';
import { KHYLO_COLORS } from './tokens';

export interface BreadcrumbItem {
    label: string;
    to?: string;
    href?: string;
}

interface KhyloPageHeaderProps {
    /** Breadcrumb hierarchy */
    breadcrumbs?: BreadcrumbItem[];
    /** Primary page/resource title */
    title: string;
    /** Technical context description */
    subtitle?: ReactNode;
    /** Status badge or indicator (e.g. Active, Healthy, 12 Items) */
    badge?: ReactNode;
    /** Right-aligned action buttons */
    actions?: ReactNode;
    /** Optional secondary toolbar or tabs rendered below */
    children?: ReactNode;
}

/**
 * Standardized Khylo Page Header.
 * Gives every admin workspace clear geographic and operational context.
 */
export const KhyloPageHeader: FC<KhyloPageHeaderProps> = ({
    breadcrumbs,
    title,
    subtitle,
    badge,
    actions,
    children
}) => {
    return (
        <Box
            sx={{
                mb: 3,
                pb: 2,
                borderBottom: `1px solid ${KHYLO_COLORS.borderDefault}`
            }}
        >
            {breadcrumbs && breadcrumbs.length > 0 && (
                <Breadcrumbs
                    separator={<NavigateNextIcon sx={{ fontSize: 13, color: KHYLO_COLORS.textMuted }} />}
                    sx={{ mb: 1 }}
                >
                    {breadcrumbs.map((item, idx) => {
                        const isLast = idx === breadcrumbs.length - 1;
                        const target = item.to || item.href;
                        if (isLast || !target) {
                            return (
                                <Typography
                                    key={idx}
                                    variant='caption'
                                    sx={{
                                        color: isLast ? KHYLO_COLORS.textPrimary : KHYLO_COLORS.textMuted,
                                        fontWeight: isLast ? 600 : 400,
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    {item.label}
                                </Typography>
                            );
                        }
                        return (
                            <Link
                                key={idx}
                                component={RouterLink}
                                to={target}
                                sx={{
                                    color: KHYLO_COLORS.textMuted,
                                    fontSize: '0.75rem',
                                    textDecoration: 'none',
                                    '&:hover': {
                                        color: KHYLO_COLORS.accent,
                                        textDecoration: 'underline'
                                    }
                                }}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </Breadcrumbs>
            )}

            <Box
                sx={{
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2
                }}
            >
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <Typography
                            variant='h5'
                            component='h1'
                            sx={{
                                fontWeight: 700,
                                color: KHYLO_COLORS.textPrimary,
                                letterSpacing: '-0.01em',
                                fontSize: '1.35rem',
                                lineHeight: 1.2
                            }}
                        >
                            {title}
                        </Typography>
                        {badge}
                    </Box>
                    {subtitle && (
                        <Typography
                            variant='body2'
                            sx={{
                                color: KHYLO_COLORS.textSecondary,
                                mt: 0.5,
                                fontSize: '0.82rem',
                                maxWidth: 800
                            }}
                        >
                            {subtitle}
                        </Typography>
                    )}
                </Box>

                {actions && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        {actions}
                    </Box>
                )}
            </Box>

            {children && (
                <Box sx={{ mt: 2.5 }}>
                    {children}
                </Box>
            )}
        </Box>
    );
};

export default KhyloPageHeader;
