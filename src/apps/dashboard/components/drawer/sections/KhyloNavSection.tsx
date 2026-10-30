import React, { type FC, type ReactNode, useCallback, useState } from 'react';
import Collapse from '@mui/material/Collapse';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useLocation } from 'react-router-dom';

import ListItemLink from 'components/ListItemLink';

export interface KhyloNavItem {
    label: string;
    to: string;
    includePaths?: string[];
    excludePaths?: string[];
}

interface KhyloNavSectionProps {
    label: string;
    icon: ReactNode;
    items: KhyloNavItem[];
    /** Override whether the section starts expanded (defaults to true if any child is active) */
    defaultOpen?: boolean;
}

const KhyloNavSection: FC<KhyloNavSectionProps> = ({ label, icon, items, defaultOpen }) => {
    const location = useLocation();

    const isAnyChildActive = items.some(item => {
        const paths = [item.to, ...(item.includePaths ?? [])];
        return paths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
    });

    const [ isOpen, setIsOpen ] = useState(defaultOpen ?? isAnyChildActive);

    const toggle = useCallback(() => setIsOpen(v => !v), []);

    return (
        <>
            <ListItemButton
                onClick={toggle}
                sx={{
                    px: 2,
                    py: 0.75,
                    borderRadius: '6px',
                    mx: 1,
                    '&:hover': {
                        bgcolor: 'rgba(217, 119, 50, 0.07)'
                    }
                }}
            >
                <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                    {icon}
                </ListItemIcon>
                <ListItemText
                    primary={
                        <Typography
                            variant='overline'
                            sx={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                letterSpacing: '0.1em',
                                color: 'text.secondary',
                                lineHeight: 1
                            }}
                        >
                            {label}
                        </Typography>
                    }
                />
                <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
                    {isOpen ? <ExpandLess fontSize='small' /> : <ExpandMore fontSize='small' />}
                </Box>
            </ListItemButton>

            <Collapse in={isOpen} timeout='auto' unmountOnExit>
                <List component='div' disablePadding>
                    {items.map(item => (
                        <ListItemLink
                            key={item.to}
                            to={item.to}
                            includePaths={item.includePaths}
                            excludePaths={item.excludePaths}
                            sx={{
                                pl: 4.5,
                                pr: 2,
                                py: 0.6,
                                borderRadius: '6px',
                                mx: 1,
                                mb: 0.25,
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(217, 119, 50, 0.12)',
                                    borderLeft: '2px solid #D97732',
                                    pl: '34px',
                                    '& .MuiListItemText-primary': {
                                        color: '#D97732',
                                        fontWeight: 600
                                    }
                                },
                                '&:hover': {
                                    bgcolor: 'rgba(217, 119, 50, 0.07)'
                                }
                            }}
                        >
                            <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    color: 'text.primary'
                                }}
                            />
                        </ListItemLink>
                    ))}
                </List>
            </Collapse>
        </>
    );
};

export default KhyloNavSection;
