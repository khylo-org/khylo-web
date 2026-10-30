import axios from 'axios';
import React, { FunctionComponent, useEffect, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Legacy element web components
import 'elements/khylo-button/khylo-button';
import 'elements/khylo-checkbox/khylo-checkbox';
import 'elements/khylo-input/khylo-input';
import 'elements/khylo-select/khylo-select';
import 'elements/khylo-collapse/khylo-collapse';
import 'elements/khylo-slider/khylo-slider';
import 'elements/khylo-textarea/khylo-textarea';
import 'elements/khylo-toggle/khylo-toggle';

import Dashboard from 'utils/dashboard';
import globalize from 'lib/globalize';
import { ServerConnections } from 'lib/khylo-apiclient';

interface ServerContentPageProps {
    view: string;
}

/**
 * Clean, robust server content page renderer for extension configuration pages.
 * Directly executes plugin script logic, binds events, and displays configuration
 * with modern Khylo dark UI styles.
 */
const ServerContentPage: FunctionComponent<ServerContentPageProps> = ({ view }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const pluginName = searchParams.get('name') || 'Plugin Configuration';

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setLoadError(null);

        const createdScripts: HTMLScriptElement[] = [];

        const loadContent = async () => {
            try {
                const apiClient = ServerConnections.currentApiClient();
                if (!apiClient) {
                    throw new Error('Server connection is not established');
                }

                // Ensure global references are attached for legacy plugin scripts
                (window as any).ApiClient = apiClient;
                (window as any).Dashboard = Dashboard;

                // Polyfill ApiClient.fetch for legacy plugins like TMDb if missing
                if (!(apiClient as any).fetch) {
                    (apiClient as any).fetch = async (req: any) => {
                        const url = req.url || '';
                        const method = req.type || req.method || 'GET';
                        const headers: Record<string, string> = { ...(req.headers || {}) };
                        const token = apiClient.accessToken ? apiClient.accessToken() : '';
                        if (token && !headers['Authorization']) {
                            headers['Authorization'] = `MediaBrowser Token="${token}"`;
                        }
                        if (req.dataType === 'json' && !headers['Accept']) {
                            headers['Accept'] = 'application/json';
                        }
                        const resp = await fetch(url, {
                            method,
                            headers,
                            body: req.data ? (typeof req.data === 'string' ? req.data : JSON.stringify(req.data)) : undefined
                        });
                        if (!resp.ok) throw resp;
                        if (req.dataType === 'json' || (resp.headers.get('content-type') || '').includes('json')) {
                            return await resp.json();
                        }
                        return await resp.text();
                    };
                }

                // Request translated HTML from server using fetch / axios fallback
                const targetUrl = apiClient.getUrl(view + location.search);
                const token = apiClient.accessToken ? apiClient.accessToken() : '';
                const headers: Record<string, string> = {
                    'Accept': 'text/html, application/xhtml+xml, */*'
                };
                if (token) {
                    headers['Authorization'] = `MediaBrowser Token="${token}"`;
                }

                let rawHtml = '';
                try {
                    const fetchResp = await fetch(targetUrl, { headers });
                    if (!fetchResp.ok) throw new Error(`HTTP ${fetchResp.status}: ${fetchResp.statusText}`);
                    rawHtml = await fetchResp.text();
                } catch {
                    const axiosResp = await axios.get<string>(targetUrl, {
                        headers: token ? { Authorization: `MediaBrowser Token="${token}"` } : undefined,
                        responseType: 'text'
                    });
                    rawHtml = axiosResp.data;
                }

                if (!isMounted) return;

                const translatedHtml = await globalize.translateHtml(rawHtml);
                if (!isMounted) return;

                const parser = new DOMParser();
                const doc = parser.parseFromString(translatedHtml, 'text/html');

                // Extract all script tags to execute them explicitly
                const scripts = Array.from(doc.querySelectorAll('script'));
                scripts.forEach(s => s.remove());

                // Find content root
                const pageElement = doc.querySelector('div[data-role="page"]') || doc.body;

                if (!containerRef.current) return;
                containerRef.current.innerHTML = '';

                // Insert HTML structure
                const contentDiv = document.createElement('div');
                contentDiv.innerHTML = pageElement.outerHTML || pageElement.innerHTML;
                containerRef.current.appendChild(contentDiv);

                // Execute scripts in document context
                for (const oldScript of scripts) {
                    const newScript = document.createElement('script');
                    if (oldScript.type) newScript.type = oldScript.type;
                    if (oldScript.src) {
                        newScript.src = oldScript.src;
                    } else {
                        newScript.textContent = oldScript.textContent;
                    }
                    containerRef.current.appendChild(newScript);
                    createdScripts.push(newScript);
                }

                // Give DOM and scripts a moment to attach handlers before firing pageshow
                await new Promise(r => setTimeout(r, 60));
                if (!isMounted) return;

                const activePage = containerRef.current.querySelector('#configPage, .configPage, [data-role="page"]') || containerRef.current;
                const eventDetail = {
                    detail: {
                        params: Object.fromEntries(searchParams.entries()),
                        isRestored: false
                    },
                    bubbles: true,
                    cancelable: false
                };

                activePage.dispatchEvent(new CustomEvent('viewshow', eventDetail));
                activePage.dispatchEvent(new CustomEvent('pageshow', eventDetail));
                document.dispatchEvent(new CustomEvent('viewshow', eventDetail));
                document.dispatchEvent(new CustomEvent('pageshow', eventDetail));
                window.dispatchEvent(new CustomEvent('viewshow', eventDetail));
                window.dispatchEvent(new CustomEvent('pageshow', eventDetail));

                setIsLoading(false);
            } catch (err: any) {
                console.error('[ServerContentPage] Failed to render extension page:', err);
                if (isMounted) {
                    setLoadError(err?.message || 'Failed to load plugin configuration page');
                    setIsLoading(false);
                }
            }
        };

        const timer = setTimeout(() => {
            void loadContent();
        }, 30);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (containerRef.current) {
                const activePage = containerRef.current.querySelector('.configPage, [data-role="page"]');
                if (activePage) {
                    try {
                        activePage.dispatchEvent(new CustomEvent('viewhide', { bubbles: true }));
                        activePage.dispatchEvent(new CustomEvent('pagehide', { bubbles: true }));
                    } catch (e) {
                        // ignore
                    }
                }
                containerRef.current.innerHTML = '';
            }
            createdScripts.forEach(s => s.remove());
        };
    }, [view, location.search, searchParams]);

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, width: '100%', maxWidth: 1000, margin: '0 auto', boxSizing: 'border-box' }}>
            {/* Header bar */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pb: 2,
                    mb: 3,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                <Box>
                    <Typography variant='caption' sx={{ color: '#D97732', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Extension Configuration
                    </Typography>
                    <Typography variant='h5' sx={{ fontWeight: 700, color: '#FAF8F5' }}>
                        {pluginName}
                    </Typography>
                </Box>
                <Button
                    size='small'
                    variant='outlined'
                    startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
                    onClick={() => navigate('/dashboard/plugins')}
                    sx={{
                        textTransform: 'none',
                        color: '#94A3B8',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        fontWeight: 600,
                        '&:hover': { color: '#FAF8F5', borderColor: '#D97732' }
                    }}
                >
                    Back to Plugins
                </Button>
            </Box>

            {isLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 6, justifyContent: 'center' }}>
                    <CircularProgress size={28} sx={{ color: '#D97732' }} />
                    <Typography variant='body2' sx={{ color: '#94A3B8' }}>
                        Loading configuration interface…
                    </Typography>
                </Box>
            )}

            {loadError && (
                <Paper variant='outlined' sx={{ p: 3, bgcolor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: 2 }}>
                    <Typography color='error' variant='body2' sx={{ fontWeight: 600, mb: 1 }}>
                        Unable to load extension configuration
                    </Typography>
                    <Typography variant='caption' sx={{ color: '#94A3B8' }}>
                        {loadError}
                    </Typography>
                </Paper>
            )}

            {/* Injected Plugin DOM Container with modern dark styles */}
            <Paper
                variant='outlined'
                sx={{
                    p: { xs: 2.5, sm: 3.5 },
                    borderRadius: 2,
                    bgcolor: '#121215',
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    display: isLoading ? 'none' : 'block',
                    // Scoped modern form styles for legacy elements
                    '& .inputContainer': {
                        mb: 2.5
                    },
                    '& .inputLabel, & label.inputLabelUnfocused, & label.inputLabelFocused': {
                        display: 'block',
                        mb: 0.75,
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: '#FAF8F5 !important'
                    },
                    '& .khylo-input, & .khylo-select, & select, & input[type="text"], & input[type="number"], & input[type="password"]': {
                        bgcolor: '#18181D !important',
                        border: '1px solid rgba(255, 255, 255, 0.14) !important',
                        borderRadius: '6px !important',
                        color: '#FAF8F5 !important',
                        padding: '10px 14px !important',
                        fontSize: '0.88rem !important',
                        width: '100% !important',
                        boxSizing: 'border-box !important',
                        outline: 'none',
                        transition: 'border-color 0.15s ease',
                        '&:focus': {
                            borderColor: '#D97732 !important',
                            boxShadow: '0 0 0 1px #D97732 !important'
                        }
                    },
                    '& .checkboxContainer': {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        mb: 1.75
                    },
                    '& .khylo-checkbox-label': {
                        color: '#FAF8F5 !important',
                        fontSize: '0.88rem !important',
                        cursor: 'pointer',
                        userSelect: 'none'
                    },
                    '& .fieldDescription': {
                        color: '#94A3B8 !important',
                        fontSize: '0.78rem !important',
                        mt: 0.75,
                        lineHeight: 1.4
                    },
                    '& .sectionTitle': {
                        color: '#FAF8F5 !important',
                        fontSize: '1.05rem !important',
                        fontWeight: '700 !important',
                        mt: 3,
                        mb: 1.5
                    },
                    '& button.raised, & button.button-submit, & button.btnSave, & button[type="submit"]': {
                        bgcolor: '#D97732 !important',
                        color: '#FFFFFF !important',
                        border: 'none !important',
                        borderRadius: '6px !important',
                        padding: '10px 24px !important',
                        fontWeight: '600 !important',
                        fontSize: '0.88rem !important',
                        cursor: 'pointer !important',
                        mt: 3,
                        transition: 'background-color 0.15s ease',
                        '&:hover': {
                            bgcolor: '#C26322 !important'
                        }
                    },
                    '& .content-primary': {
                        padding: '0 !important',
                        margin: '0 !important',
                        width: '100% !important',
                        maxWidth: '100% !important'
                    }
                }}
            >
                <div ref={containerRef} style={{ width: '100%', minHeight: 200 }} />
            </Paper>
        </Box>
    );
};

export default ServerContentPage;
