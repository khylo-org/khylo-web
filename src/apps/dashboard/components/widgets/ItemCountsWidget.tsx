import type { ItemCounts } from '@khylo/sdk/lib/generated-client/models/item-counts';
import Book from '@mui/icons-material/Book';
import Headphones from '@mui/icons-material/Headphones';
import MenuBook from '@mui/icons-material/MenuBook';
import Movie from '@mui/icons-material/Movie';
import MusicNote from '@mui/icons-material/MusicNote';
import MusicVideo from '@mui/icons-material/MusicVideo';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import Podcasts from '@mui/icons-material/Podcasts';
import Tv from '@mui/icons-material/Tv';
import VideoLibrary from '@mui/icons-material/VideoLibrary';
import Grid from '@mui/material/Grid';
import SvgIcon from '@mui/material/SvgIcon';
import React, { useMemo } from 'react';

import { useItemCounts } from 'apps/dashboard/features/metrics/api/useItemCounts';
import MetricCard, { type MetricCardProps } from 'apps/dashboard/features/metrics/components/MetricCard';
import globalize from 'lib/globalize';
import Box from '@mui/material/Box';

interface MetricDefinition {
    key: keyof ItemCounts | 'ComicCount' | 'ComicSeriesCount' | 'PodcastCount' | 'PodcastEpisodeCount' | 'PhotoCount' | 'AudioBookCount'
    i18n: string
}

interface CardDefinition {
    Icon: typeof SvgIcon
    metrics: MetricDefinition[]
}

const CARD_DEFINITIONS: CardDefinition[] = [
    {
        Icon: Movie,
        metrics: [{ key: 'MovieCount', i18n: 'Movies' }]
    }, {
        Icon: Tv,
        metrics: [
            { key: 'SeriesCount', i18n: 'Series' },
            { key: 'EpisodeCount', i18n: 'Episodes' }
        ]
    }, {
        Icon: MusicNote,
        metrics: [
            { key: 'AlbumCount', i18n: 'Albums' },
            { key: 'SongCount', i18n: 'Songs' }
        ]
    }, {
        Icon: MusicVideo,
        metrics: [{ key: 'MusicVideoCount', i18n: 'MusicVideos' }]
    }, {
        Icon: Book,
        metrics: [{ key: 'BookCount', i18n: 'Books' }]
    }, {
        Icon: Headphones,
        metrics: [{ key: 'AudioBookCount', i18n: 'Audiobooks' }]
    }, {
        Icon: MenuBook,
        metrics: [
            { key: 'ComicCount', i18n: 'Comics' },
            { key: 'ComicSeriesCount', i18n: 'Series' }
        ]
    }, {
        Icon: Podcasts,
        metrics: [
            { key: 'PodcastCount', i18n: 'Podcasts' },
            { key: 'PodcastEpisodeCount', i18n: 'Episodes' }
        ]
    }, {
        Icon: PhotoCamera,
        metrics: [{ key: 'PhotoCount', i18n: 'Photos' }]
    }, {
        Icon: VideoLibrary,
        metrics: [{ key: 'BoxSetCount', i18n: 'Collections' }]
    }
];

const ItemCountsWidget = () => {
    const {
        data: counts,
        isPending
    } = useItemCounts();

    const cards: MetricCardProps[] = useMemo(() => {
        return CARD_DEFINITIONS
            .filter(def => (
                // Include all cards while the request is pending
                isPending
                // Check if the metrics are present in counts
                || def.metrics.some(({ key }) => (counts as Record<string, number | undefined>)?.[key])
            ))
            .map(({ Icon, metrics }) => ({
                Icon,
                metrics: metrics.map(({ i18n, key }) => ({
                    label: globalize.translate(i18n),
                    value: (counts as Record<string, number | undefined>)?.[key]
                }))
            }));
    }, [ counts, isPending ]);

    return (
        <Box>
            <Grid
                container
                spacing={2}
                sx={{
                    alignItems: 'stretch'
                }}
            >
                {cards.map(card => (
                    <Grid
                        key={card.metrics.map(metric => metric.label).join('-')}
                        item
                        xs={12}
                        sm={6}
                        lg={4}
                    >
                        <MetricCard {...card} />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default ItemCountsWidget;
