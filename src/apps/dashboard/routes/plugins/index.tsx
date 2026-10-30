import React, { FC, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import ExtensionIcon from '@mui/icons-material/Extension';
import { Link } from 'react-router-dom';

import Page from 'components/Page';
import Loading from 'components/loading/LoadingComponent';
import { usePluginDetails } from 'apps/dashboard/features/plugins/api/usePluginDetails';
import NoPluginResults from 'apps/dashboard/features/plugins/components/NoPluginResults';
import PluginCard from 'apps/dashboard/features/plugins/components/PluginCard';
import { CATEGORY_LABELS } from 'apps/dashboard/features/plugins/constants/categoryLabels';
import { PluginCategory } from 'apps/dashboard/features/plugins/constants/pluginCategory';
import { PluginStatusOption } from 'apps/dashboard/features/plugins/constants/pluginStatusOption';
import useSearchParam from 'hooks/useSearchParam';
import globalize from 'lib/globalize';

import {
    KHYLO_COLORS,
    KhyloPage,
    KhyloPageHeader,
    KhyloTabs,
    KhyloStatusBadge,
    KhyloEmptyState
} from '../../components/ui';

const MAIN_CATEGORIES = [
    PluginCategory.Administration.toLowerCase(),
    PluginCategory.General.toLowerCase(),
    PluginCategory.Anime.toLowerCase(),
    PluginCategory.Books.toLowerCase(),
    PluginCategory.LiveTV.toLowerCase(),
    PluginCategory.MoviesAndShows.toLowerCase(),
    PluginCategory.Music.toLowerCase(),
    PluginCategory.Subtitles.toLowerCase()
];

const CATEGORY_PARAM = 'category';
const QUERY_PARAM = 'query';
const STATUS_PARAM = 'status';

export const Component: FC = () => {
    const { data: pluginDetails, isError, isPending, isCatalogPending, isCatalogUnavailable } = usePluginDetails();
    const [category, setCategory] = useSearchParam(CATEGORY_PARAM);
    const [searchQuery, setSearchQuery] = useSearchParam(QUERY_PARAM);
    const [status, setStatus] = useSearchParam(STATUS_PARAM, PluginStatusOption.Installed);

    const onSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    }, [setSearchQuery]);

    const onViewAll = useCallback(() => {
        if (category) setCategory('');
        else setStatus(PluginStatusOption.All);
    }, [category, setCategory, setStatus]);

    const installedCount = useMemo(() => {
        if (!pluginDetails) return 0;
        return pluginDetails.filter(p => p.status).length;
    }, [pluginDetails]);

    const availableCount = useMemo(() => {
        if (!pluginDetails) return 0;
        return pluginDetails.filter(p => !p.status).length;
    }, [pluginDetails]);

    const filteredPlugins = useMemo(() => {
        if (!pluginDetails) return [];
        let filtered = pluginDetails;

        if (status === PluginStatusOption.Installed) {
            filtered = filtered.filter(p => p.status);
        } else if (status === PluginStatusOption.Available) {
            filtered = filtered.filter(p => !p.status);
        }

        if (category) {
            if (category === PluginCategory.Other.toLowerCase()) {
                filtered = filtered.filter(p => (
                    p.category && !MAIN_CATEGORIES.includes(p.category.toLowerCase())
                ));
            } else {
                filtered = filtered.filter(p => p.category?.toLowerCase() === category);
            }
        }

        return filtered.filter(i =>
            !searchQuery.trim() ||
            (i.name && i.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (i.description && i.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [category, pluginDetails, searchQuery, status]);

    if (isPending) return <Loading />;

    return (
        <Page id='pluginsPage' title='Plugins & Extensions' className='type-interior mainAnimatedPage'>
            <KhyloPage>
                <KhyloPageHeader
                    breadcrumbs={[
                        { label: 'Extensions' },
                        { label: 'Plugins' }
                    ]}
                    title='Plugins & Extensions'
                    subtitle='Installed metadata agents, subtitle providers, scraper engines, and ecosystem extensions.'
                    badge={
                        <KhyloStatusBadge
                            label={`${installedCount} Active • ${availableCount} Available`}
                            color={installedCount > 0 ? 'healthy' : 'idle'}
                        />
                    }
                    actions={
                        <Button
                            component={Link}
                            to='/dashboard/plugins/repositories'
                            variant='outlined'
                            size='small'
                            startIcon={<StorageIcon />}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.82rem',
                                borderColor: KHYLO_COLORS.borderDefault,
                                color: KHYLO_COLORS.textPrimary,
                                '&:hover': {
                                    borderColor: KHYLO_COLORS.accent,
                                    bgcolor: KHYLO_COLORS.surfaceHover
                                }
                            }}
                        >
                            Repository Sources
                        </Button>
                    }
                >
                    <KhyloTabs
                        activeTab={status}
                        onChange={(tab) => setStatus(tab as PluginStatusOption)}
                        tabs={[
                            { id: PluginStatusOption.Installed, label: 'Installed Extensions', count: installedCount },
                            { id: PluginStatusOption.Available, label: 'Catalog / Available', count: availableCount },
                            { id: PluginStatusOption.All, label: 'All Extensions', count: (pluginDetails || []).length }
                        ]}
                    />
                </KhyloPageHeader>

                {isError && (
                    <Alert severity='error' sx={{ mb: 3 }}>
                        Khylo couldn&apos;t load its installed plugins. Try again in a moment.
                    </Alert>
                )}

                {status !== PluginStatusOption.Installed && isCatalogPending && (
                    <Alert severity='info' sx={{ mb: 3 }}>
                        Loading the plugin catalog&hellip;
                    </Alert>
                )}

                {status !== PluginStatusOption.Installed && !isCatalogPending && isCatalogUnavailable && (
                    <Alert severity='warning' sx={{ mb: 3 }}>
                        The plugin catalog can&apos;t be reached from this server right now, so only installed plugins are shown.
                        Check that the server can reach the internet, or the addresses under Repository Sources.
                    </Alert>
                )}

                {/* Filter Toolbar */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: { xs: 'stretch', md: 'center' },
                        justifyContent: 'space-between',
                        gap: 2,
                        mb: 3
                    }}
                >
                    {/* Category Filter Chips */}
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 1,
                            overflowX: 'auto',
                            py: 0.5,
                            '&::-webkit-scrollbar': { height: 4 }
                        }}
                    >
                        <Chip
                            label='All Categories'
                            size='small'
                            clickable
                            onClick={() => setCategory('')}
                            sx={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                bgcolor: !category ? KHYLO_COLORS.accent : KHYLO_COLORS.surfaceSecondary,
                                color: !category ? KHYLO_COLORS.textPrimary : KHYLO_COLORS.textSecondary,
                                border: `1px solid ${!category ? KHYLO_COLORS.accent : KHYLO_COLORS.borderSubtle}`
                            }}
                        />
                        {Object.values(PluginCategory).map(c => {
                            const isSelected = category === c.toLowerCase();
                            return (
                                <Chip
                                    key={c}
                                    label={globalize.translate(CATEGORY_LABELS[c as PluginCategory])}
                                    size='small'
                                    clickable
                                    onClick={() => setCategory(c.toLowerCase())}
                                    sx={{
                                        fontSize: '0.75rem',
                                        fontWeight: isSelected ? 600 : 400,
                                        bgcolor: isSelected ? KHYLO_COLORS.accent : KHYLO_COLORS.surfaceSecondary,
                                        color: isSelected ? KHYLO_COLORS.textPrimary : KHYLO_COLORS.textSecondary,
                                        border: `1px solid ${isSelected ? KHYLO_COLORS.accent : KHYLO_COLORS.borderSubtle}`
                                    }}
                                />
                            );
                        })}
                    </Box>

                    {/* Search Field */}
                    <TextField
                        size='small'
                        value={searchQuery}
                        onChange={onSearchChange}
                        placeholder='Search extensions…'
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position='start'>
                                    <SearchIcon sx={{ fontSize: 16, color: KHYLO_COLORS.textMuted }} />
                                </InputAdornment>
                            ),
                            sx: {
                                fontSize: '0.82rem',
                                bgcolor: KHYLO_COLORS.surfaceSecondary,
                                minWidth: { xs: '100%', md: 240 }
                            }
                        }}
                    />
                </Box>

                {/* Plugin Grid */}
                {filteredPlugins.length > 0 ? (
                    // eslint-disable-next-line @typescript-eslint/no-deprecated
                    <Grid container spacing={2}>
                        {filteredPlugins.map(plugin => (
                            // eslint-disable-next-line @typescript-eslint/no-deprecated
                            <Grid
                                key={plugin.id}
                                item
                                xs={12}
                                sm={6}
                                md={4}
                                lg={3}
                                xl={2}
                            >
                                <PluginCard plugin={plugin} />
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <NoPluginResults
                        isFiltered={Boolean(category) || status !== PluginStatusOption.All}
                        onViewAll={onViewAll}
                        query={searchQuery}
                    />
                )}
            </KhyloPage>
        </Page>
    );
};

Component.displayName = 'InstalledPlugins';
export default Component;
