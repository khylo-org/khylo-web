import React, { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { ItemFields } from '@khylo/sdk/lib/generated-client/models/item-fields';
import { ItemSortBy } from '@khylo/sdk/lib/generated-client/models/item-sort-by';
import { SortOrder } from '@khylo/sdk/lib/generated-client/models/sort-order';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import PauseRounded from '@mui/icons-material/PauseRounded';
import SlideshowRounded from '@mui/icons-material/SlideshowRounded';

import Page from 'components/Page';
import { useApi } from 'hooks/useApi';

const SLIDE_SECONDS = 5;

const imageUrl = (basePath: string, photo: BaseItemDto, maxWidth: number) => {
    const tag = photo.ImageTags?.Primary;
    const tagPart = tag ? '&tag=' + tag : '';
    return `${basePath}/Items/${photo.Id}/Images/Primary?maxWidth=${maxWidth}&quality=90${tagPart}`;
};

const takenOn = (photo: BaseItemDto) => {
    const when = photo.PremiereDate || photo.DateCreated;
    return when ? new Date(when).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
};

/** Full-screen photo viewer: arrows or swipe through, Esc to close, and a slideshow. */
const PhotoViewer: FC<{ photos: BaseItemDto[]; index: number; basePath: string; onIndex: (i: number) => void; onClose: () => void; startSlideshow: boolean }> = ({
    photos, index, basePath, onIndex, onClose, startSlideshow
}) => {
    const [ playing, setPlaying ] = useState(startSlideshow);
    const [ touchX, setTouchX ] = useState<number | null>(null);
    const photo = photos[index];
    const go = useCallback((step: number) => onIndex((index + step + photos.length) % photos.length), [ index, photos.length, onIndex ]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowRight') {
                go(1);
            } else if (e.key === 'ArrowLeft') {
                go(-1);
            } else if (e.key === ' ') {
                e.preventDefault();
                setPlaying(p => !p);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [ go, onClose ]);

    useEffect(() => {
        if (!playing) return undefined;
        const timer = setTimeout(() => go(1), SLIDE_SECONDS * 1000);
        return () => clearTimeout(timer);
    }, [ playing, index, go ]);

    // Have the next photo ready so moving on is instant
    useEffect(() => {
        const next = photos[(index + 1) % photos.length];
        if (next) new Image().src = imageUrl(basePath, next, 2560);
    }, [ index, photos, basePath ]);

    if (!photo) return null;

    const controlSx = { color: 'rgba(255,255,255,0.85)', bgcolor: 'rgba(255,255,255,0.06)', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' } };

    return (
        <Box
            role='dialog'
            aria-label='Photo viewer'
            onTouchStart={e => setTouchX(e.touches[0].clientX)}
            onTouchEnd={e => {
                if (touchX === null) return;
                const dx = e.changedTouches[0].clientX - touchX;
                if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
                setTouchX(null);
            }}
            sx={{ position: 'fixed', inset: 0, zIndex: 1400, bgcolor: 'rgba(5,5,6,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <Box
                key={photo.Id}
                component='img'
                src={imageUrl(basePath, photo, 2560)}
                alt={photo.Name || ''}
                sx={{
                    maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain', userSelect: 'none',
                    animation: 'khyloPhotoFade 280ms ease',
                    '@keyframes khyloPhotoFade': { from: { opacity: 0 }, to: { opacity: 1 } }
                }}
            />

            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 1.5, px: { xs: 2, sm: 3 }, py: 2, background: 'linear-gradient(rgba(0,0,0,0.55), transparent)' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.Name}</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                        {[ takenOn(photo), `${index + 1} of ${photos.length}` ].filter(Boolean).join('  ·  ')}
                    </Typography>
                </Box>
                <IconButton aria-label={playing ? 'Pause slideshow' : 'Start slideshow'} onClick={() => setPlaying(p => !p)} sx={controlSx}>
                    {playing ? <PauseRounded /> : <SlideshowRounded />}
                </IconButton>
                <IconButton aria-label='Close' onClick={onClose} sx={controlSx}>
                    <CloseRounded />
                </IconButton>
            </Box>

            {photos.length > 1 && (
                <>
                    <IconButton aria-label='Previous photo' onClick={() => go(-1)} sx={{ ...controlSx, position: 'absolute', left: { xs: 8, sm: 24 }, top: '50%', transform: 'translateY(-50%)', display: { xs: 'none', sm: 'inline-flex' } }}>
                        <ChevronLeftRounded fontSize='large' />
                    </IconButton>
                    <IconButton aria-label='Next photo' onClick={() => go(1)} sx={{ ...controlSx, position: 'absolute', right: { xs: 8, sm: 24 }, top: '50%', transform: 'translateY(-50%)', display: { xs: 'none', sm: 'inline-flex' } }}>
                        <ChevronRightRounded fontSize='large' />
                    </IconButton>
                </>
            )}
        </Box>
    );
};

/**
 * A photo library: every picture in it (loose or in folders) in a calm grid, newest first, opening into a
 * full-screen viewer with a slideshow. Photos are looked at, never "played".
 */
export const KhyloPhotoLibrary: FC = () => {
    const { api, user } = useApi();
    const [ params, setParams ] = useSearchParams();
    const parentId = params.get('topParentId') || params.get('parentId') || undefined;
    const openPhotoId = params.get('photoId');
    const [ startSlideshow, setStartSlideshow ] = useState(false);

    const { data: library } = useQuery({
        queryKey: [ 'KhyloPhotoLibraryInfo', parentId, user?.Id ],
        queryFn: async () => (await getLibraryApi(api!).getItem({ itemId: parentId!, userId: user?.Id })).data,
        enabled: Boolean(api && parentId)
    });

    const { data: photos, isPending } = useQuery({
        queryKey: [ 'KhyloPhotoLibraryPhotos', parentId, user?.Id ],
        queryFn: async () => (await getLibraryApi(api!).getItems({
            userId: user?.Id,
            parentId,
            recursive: true,
            includeItemTypes: [ BaseItemKind.Photo ],
            sortBy: [ ItemSortBy.PremiereDate, ItemSortBy.DateCreated, ItemSortBy.SortName ],
            sortOrder: [ SortOrder.Descending ],
            fields: [ ItemFields.PrimaryImageAspectRatio, ItemFields.DateCreated ],
            enableImageTypes: [ 'Primary' as never ],
            limit: 5000
        })).data.Items ?? [],
        enabled: Boolean(api)
    });

    const list = useMemo(() => photos ?? [], [ photos ]);
    const openIndex = openPhotoId ? list.findIndex(p => p.Id === openPhotoId) : -1;

    const open = useCallback((index: number, slideshow = false) => {
        setStartSlideshow(slideshow);
        const next = new URLSearchParams(params);
        next.set('photoId', list[index].Id!);
        setParams(next, { replace: openPhotoId !== null });
    }, [ list, params, setParams, openPhotoId ]);

    const close = useCallback(() => {
        const next = new URLSearchParams(params);
        next.delete('photoId');
        setParams(next, { replace: true });
    }, [ params, setParams ]);

    const basePath = api?.basePath ?? '';
    const title = library?.Name || 'Photos';

    return (
        <Page id='khyloPhotoLibrary' className='mainAnimatedPage libraryPage' title={title}>
            <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 2, sm: 4 }, pt: { xs: 9, sm: 11 }, pb: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography component='h1' sx={{ fontSize: { xs: '1.35rem', sm: '1.6rem' }, fontWeight: 700, color: '#FAF8F5', letterSpacing: '-0.01em' }}>{title}</Typography>
                        {!isPending && (
                            <Typography sx={{ fontSize: '0.85rem', color: 'rgba(250,248,245,0.55)' }}>
                                {list.length === 1 ? '1 photo' : `${list.length.toLocaleString()} photos`}
                            </Typography>
                        )}
                    </Box>
                    {list.length > 1 && (
                        <Box
                            component='button'
                            type='button'
                            onClick={() => open(0, true)}
                            sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderRadius: '999px', cursor: 'pointer',
                                border: '1px solid rgba(255,255,255,0.12)', bgcolor: 'rgba(255,255,255,0.06)', color: '#FAF8F5', font: 'inherit', fontSize: '0.88rem', fontWeight: 600,
                                transition: 'background-color 150ms ease', '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' }
                            }}
                        >
                            <SlideshowRounded sx={{ fontSize: 18 }} /> Slideshow
                        </Box>
                    )}
                </Box>

                {isPending && <Box sx={{ py: 10, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} /></Box>}

                {!isPending && list.length === 0 && (
                    <Typography sx={{ py: 10, textAlign: 'center', color: 'rgba(250,248,245,0.55)' }}>
                        No photos here yet. Add pictures to this library&apos;s folder and they&apos;ll show up after the next scan.
                    </Typography>
                )}

                <Box sx={{ display: 'grid', gap: { xs: '4px', sm: '6px' }, gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(auto-fill, minmax(200px, 1fr))' } }}>
                    {list.map((photo, index) => (
                        <Box
                            key={photo.Id}
                            component='button'
                            type='button'
                            aria-label={photo.Name || 'Photo'}
                            onClick={() => open(index)}
                            sx={{
                                p: 0, border: 'none', cursor: 'pointer', aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: { xs: '2px', sm: '6px' },
                                bgcolor: '#1C1C22', display: 'block',
                                '& img': { transition: 'transform 220ms ease' },
                                '&:hover img, &:focus-visible img': { transform: 'scale(1.04)' },
                                '&:focus-visible': { outline: '2px solid #D97732', outlineOffset: 2 }
                            }}
                        >
                            <Box component='img' loading='lazy' src={imageUrl(basePath, photo, 480)} alt='' sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </Box>
                    ))}
                </Box>
            </Box>

            {openIndex >= 0 && (
                <PhotoViewer
                    photos={list}
                    index={openIndex}
                    basePath={basePath}
                    startSlideshow={startSlideshow}
                    onIndex={i => open(i, false)}
                    onClose={close}
                />
            )}
        </Page>
    );
};

export default KhyloPhotoLibrary;
