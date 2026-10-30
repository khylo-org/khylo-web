import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

type WidgetProps = {
    title: string;
    href: string;
    children: React.ReactNode;
};

const Widget = ({ title, href, children }: WidgetProps) => {
    return (
        <Box sx={{ mb: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1.5,
                    px: 0.5
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Box
                        sx={{
                            width: '4px',
                            height: '18px',
                            borderRadius: '2px',
                            background: 'linear-gradient(180deg, #D97732 0%, #E68A45 100%)',
                            boxShadow: '0 0 8px rgba(217, 119, 50, 0.4)'
                        }}
                    />
                    <Typography
                        variant='subtitle1'
                        component='h2'
                        sx={{
                            fontWeight: 700,
                            letterSpacing: '0.01em',
                            color: '#FAF8F5',
                            fontSize: '1.05rem'
                        }}
                    >
                        {title}
                    </Typography>
                </Box>
                {href && (
                    <Button
                        component={RouterLink}
                        to={href}
                        size='small'
                        endIcon={<ArrowForwardIcon sx={{ fontSize: '0.85rem !important' }} />}
                        sx={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'rgba(250, 248, 245, 0.6)',
                            textTransform: 'none',
                            px: 1.5,
                            py: 0.25,
                            borderRadius: '20px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                color: '#D97732',
                                borderColor: 'rgba(217, 119, 50, 0.4)',
                                backgroundColor: 'rgba(217, 119, 50, 0.08)'
                            }
                        }}
                    >
                        Manage
                    </Button>
                )}
            </Box>

            {children}
        </Box>
    );
};

export default Widget;
