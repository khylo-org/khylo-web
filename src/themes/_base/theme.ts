import type { ColorSystemOptions, ThemeOptions } from '@mui/material/styles';
import type {} from '@mui/material/themeCssVarsAugmentation';

const LIST_ICON_WIDTH = 36;

/** The default "Dark" color scheme. */
export const DEFAULT_COLOR_SCHEME: ColorSystemOptions = {
    palette: {
        mode: 'dark',
        primary: {
            main: '#D97732',
            contrastText: '#FFFFFF'
        },
        secondary: {
            main: '#D97732'
        },
        background: {
            default: '#090A0B',
            paper: '#121314'
        },
        text: {
            primary: '#F4F1EC',
            secondary: '#B4AEA7'
        },
        divider: 'rgba(255, 255, 255, 0.07)',
        action: {
            selectedOpacity: 0.14,
            hover: 'rgba(255, 255, 255, 0.06)',
            focus: 'rgba(217, 119, 50, 0.25)'
        },
        starIcon: {
            main: '#D97732'
        },
        error: {
            main: '#E5484D'
        },
        AppBar: {
            defaultBg: '#0E0F10'
        }
    }
};

/** The default customizations to the default MUI theme. */
export const DEFAULT_THEME_OPTIONS: ThemeOptions = {
    shape: {
        borderRadius: 12
    },
    typography: {
        fontFamily: '"Noto Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        button: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem'
        },
        h1: {
            fontSize: '2.5rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#F4F1EC'
        },
        h2: {
            fontSize: '1.75rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: '#F4F1EC'
        },
        h3: {
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#F4F1EC'
        },
        body1: {
            color: '#F4F1EC',
            fontSize: '0.95rem',
            lineHeight: 1.5
        },
        body2: {
            color: '#B4AEA7',
            fontSize: '0.875rem'
        }
    },
    components: {
        MuiAlert: {
            styleOverrides: {
                message: {
                    flexGrow: 1
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#0E0F10',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                },
                colorTransparent: ({ theme }) => ({
                    color: theme.vars.palette.text.primary
                })
            }
        },
        MuiButton: {
            defaultProps: {
                variant: 'contained'
            },
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    padding: '8px 20px',
                    minHeight: 44,
                    boxShadow: 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
                    }
                },
                containedPrimary: {
                    backgroundColor: '#D97732',
                    color: '#FFFFFF',
                    '&:hover': {
                        backgroundColor: '#B85F22'
                    }
                }
            },
            variants: [
                {
                    props: {
                        size: 'large'
                    },
                    style: {
                        fontSize: '1rem',
                        fontWeight: 700,
                        minHeight: 48,
                        padding: '10px 24px'
                    }
                }
            ]
        },
        MuiFormControl: {
            defaultProps: {
                variant: 'filled'
            }
        },
        MuiFormHelperText: {
            styleOverrides: {
                root: {
                    fontSize: '1rem'
                }
            }
        },
        MuiTextField: {
            defaultProps: {
                variant: 'filled'
            }
        },
        MuiListItemIcon: {
            styleOverrides: {
                root: {
                    minWidth: LIST_ICON_WIDTH
                }
            }
        },
        MuiListSubheader: {
            styleOverrides: {
                root: {
                    // NOTE: Added for drawer subheaders, but maybe it won't work in other cases?
                    backgroundColor: 'inherit',
                    position: 'initial'
                }
            }
        },
        MuiListItemText: {
            styleOverrides: {
                inset: {
                    paddingLeft: LIST_ICON_WIDTH
                }
            }
        }
    }
};
