import React, { useState, useEffect, useRef, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import MovieCreationOutlined from '@mui/icons-material/MovieCreationOutlined';
import TvOutlined from '@mui/icons-material/TvOutlined';
import HeadphonesOutlined from '@mui/icons-material/HeadphonesOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';

import { useApi } from 'hooks/useApi';
import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import { BaseItemKind } from '@khylo/sdk/lib/generated-client/models/base-item-kind';
import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import './KhyloSearchModal.scss';

export interface KhyloSearchModalProps {
    open: boolean;
    onClose: () => void;
}

const RECENT_SEARCHES_KEY = 'khylo_recent_searches';

// Each kind of result is searched on its own, so a big music library can't crowd out movies
// (e.g. songs named "Scream" pushing Scream 2-7 off the list)
const SEARCH_GROUPS: { types: BaseItemKind[]; limit: number }[] = [
    { types: [BaseItemKind.Movie], limit: 30 },
    { types: [BaseItemKind.Series], limit: 15 },
    { types: [BaseItemKind.Episode], limit: 12 },
    { types: [ BaseItemKind.MusicAlbum, BaseItemKind.Audio ], limit: 12 },
    { types: [BaseItemKind.Book], limit: 12 }
];

/**
 * Titles that start with the search come first (so "Scream" lists the whole franchise), then
 * titles that only contain it; each group in release order.
 */
function rankResults(items: BaseItemDto[], term: string): BaseItemDto[] {
    const lower = term.toLowerCase();
    const rank = (item: BaseItemDto) => ((item.Name ?? '').toLowerCase().startsWith(lower) ? 0 : 1);
    const year = (item: BaseItemDto) => item.ProductionYear ?? Number.MAX_SAFE_INTEGER;
    return [...items].sort((a, b) => rank(a) - rank(b) || year(a) - year(b));
}

export const KhyloSearchModal: FC<KhyloSearchModalProps> = ({ open, onClose }) => {
    const { api, user } = useApi();
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);

    const [ query, setQuery ] = useState('');
    const [ results, setResults ] = useState<BaseItemDto[]>([]);
    const [ isSearching, setIsSearching ] = useState(false);
    const [ recentSearches, setRecentSearches ] = useState<string[]>([]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (raw) {
                setRecentSearches(JSON.parse(raw));
            }
        } catch {
            // ignore
        }
    }, []);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 80);
        } else {
            setQuery('');
            setResults([]);
        }
    }, [open]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    // Debounced search
    useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed || !api || !user?.Id) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        // Ignore answers to searches the user has already typed past
        let isCurrent = true;
        const timer = setTimeout(async () => {
            try {
                const groups = await Promise.all(SEARCH_GROUPS.map(async group => {
                    const response = await getLibraryApi(api).getItems({
                        userId: user.Id,
                        searchTerm: trimmed,
                        limit: group.limit,
                        recursive: true,
                        includeItemTypes: group.types
                    });
                    return rankResults(response.data.Items || [], trimmed);
                }));
                if (isCurrent) setResults(groups.flat());
            } catch (err) {
                console.error('[KhyloSearch] Error searching:', err);
                if (isCurrent) setResults([]);
            } finally {
                if (isCurrent) setIsSearching(false);
            }
        }, 220);

        return () => {
            isCurrent = false;
            clearTimeout(timer);
        };
    }, [query, api, user?.Id]);

    const handleSelectRecent = (term: string) => {
        setQuery(term);
    };

    const handleClearRecent = () => {
        setRecentSearches([]);
        localStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    const handleSelectResult = (item: BaseItemDto) => {
        if (query.trim()) {
            const updated = [query.trim(), ...recentSearches.filter(s => s.toLowerCase() !== query.trim().toLowerCase())].slice(0, 8);
            setRecentSearches(updated);
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        }
        onClose();
        navigate(`/details?id=${item.Id}`);
    };

    if (!open) {
        return null;
    }

    const movies = results.filter(i => i.Type === BaseItemKind.Movie);
    const shows = results.filter(i => i.Type === BaseItemKind.Series);
    const episodes = results.filter(i => i.Type === BaseItemKind.Episode);
    const audio = results.filter(i => i.Type === BaseItemKind.Audio || i.Type === BaseItemKind.MusicAlbum);
    const books = results.filter(i => i.Type === BaseItemKind.Book);

    const getItemImageUrl = (item: BaseItemDto) => {
        if (!api || !item.Id) return null;
        if (item.ImageTags && item.ImageTags.Primary) {
            return `${api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=180&tag=${item.ImageTags.Primary}`;
        }
        if (item.SeriesPrimaryImageTag && item.SeriesId) {
            return `${api.basePath}/Items/${item.SeriesId}/Images/Primary?maxWidth=180&tag=${item.SeriesPrimaryImageTag}`;
        }
        return null;
    };

    return (
        <div className='khylo-search-overlay' onClick={onClose} role='dialog' aria-modal='true'>
            <div className='khylo-search-modal' onClick={e => e.stopPropagation()}>
                {/* Search Input Bar */}
                <div className='khylo-search-modal__bar'>
                    <SearchIcon className='khylo-search-modal__search-icon' />
                    <input
                        ref={inputRef}
                        type='text'
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder='Search movies, shows, music, games, and more...'
                        className='khylo-search-modal__input'
                    />
                    {query ? (
                        <button
                            type='button'
                            onClick={() => setQuery('')}
                            className='khylo-search-modal__clear-btn'
                            aria-label='Clear search'
                        >
                            <CloseIcon />
                        </button>
                    ) : (
                        <div className='khylo-search-modal__shortcut'>ESC</div>
                    )}
                </div>

                {/* Content Area */}
                <div className='khylo-search-modal__body'>
                    {/* Recent Searches when no query */}
                    {!query.trim() && (
                        <div className='khylo-search-modal__recent'>
                            <div className='khylo-search-modal__section-header'>
                                <span>Recent Searches</span>
                                {recentSearches.length > 0 && (
                                    <button
                                        type='button'
                                        onClick={handleClearRecent}
                                        className='khylo-search-modal__clear-all'
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>
                            {recentSearches.length > 0 ? (
                                <div className='khylo-search-modal__recent-chips'>
                                    {recentSearches.map(term => (
                                        <button
                                            key={term}
                                            type='button'
                                            onClick={() => handleSelectRecent(term)}
                                            className='khylo-search-modal__chip'
                                        >
                                            <HistoryIcon />
                                            <span>{term}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className='khylo-search-modal__empty-hint'>
                                    Type to search movies, TV shows, music albums, books, and collections across your server.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Searching status */}
                    {isSearching && (
                        <div className='khylo-search-modal__searching'>
                            <div className='khylo-search-modal__spinner' />
                            <span>Searching...</span>
                        </div>
                    )}

                    {/* Results categorized */}
                    {!isSearching && query.trim() && results.length === 0 && (
                        <div className='khylo-search-modal__no-results'>
                            No media found matching &ldquo;{query}&rdquo;
                        </div>
                    )}

                    {!isSearching && results.length > 0 && (
                        <div className='khylo-search-modal__results-container'>
                            {movies.length > 0 && (
                                <div className='khylo-search-category'>
                                    <div className='khylo-search-category__title'>
                                        <MovieCreationOutlined /> Movies ({movies.length})
                                    </div>
                                    <div className='khylo-search-category__grid'>
                                        {movies.map(item => (
                                            <div
                                                key={item.Id}
                                                className='khylo-search-result-item'
                                                onClick={() => handleSelectResult(item)}
                                                role='button'
                                                tabIndex={0}
                                            >
                                                <div className='khylo-search-result-item__poster'>
                                                    {getItemImageUrl(item) ? (
                                                        <img src={getItemImageUrl(item)!} alt={item.Name ?? ''} />
                                                    ) : (
                                                        <MovieCreationOutlined />
                                                    )}
                                                </div>
                                                <div className='khylo-search-result-item__meta'>
                                                    <div className='khylo-search-result-item__title'>{item.Name}</div>
                                                    <div className='khylo-search-result-item__sub'>
                                                        {item.ProductionYear || 'Movie'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {shows.length > 0 && (
                                <div className='khylo-search-category'>
                                    <div className='khylo-search-category__title'>
                                        <TvOutlined /> TV Shows ({shows.length})
                                    </div>
                                    <div className='khylo-search-category__grid'>
                                        {shows.map(item => (
                                            <div
                                                key={item.Id}
                                                className='khylo-search-result-item'
                                                onClick={() => handleSelectResult(item)}
                                                role='button'
                                                tabIndex={0}
                                            >
                                                <div className='khylo-search-result-item__poster'>
                                                    {getItemImageUrl(item) ? (
                                                        <img src={getItemImageUrl(item)!} alt={item.Name ?? ''} />
                                                    ) : (
                                                        <TvOutlined />
                                                    )}
                                                </div>
                                                <div className='khylo-search-result-item__meta'>
                                                    <div className='khylo-search-result-item__title'>{item.Name}</div>
                                                    <div className='khylo-search-result-item__sub'>
                                                        {item.ProductionYear ? `${item.ProductionYear} · Series` : 'Series'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {episodes.length > 0 && (
                                <div className='khylo-search-category'>
                                    <div className='khylo-search-category__title'>
                                        <TvOutlined /> Episodes ({episodes.length})
                                    </div>
                                    <div className='khylo-search-category__grid'>
                                        {episodes.map(item => (
                                            <div
                                                key={item.Id}
                                                className='khylo-search-result-item'
                                                onClick={() => handleSelectResult(item)}
                                                role='button'
                                                tabIndex={0}
                                            >
                                                <div className='khylo-search-result-item__poster khylo-search-result-item__poster--wide'>
                                                    {getItemImageUrl(item) ? (
                                                        <img src={getItemImageUrl(item)!} alt={item.Name ?? ''} />
                                                    ) : (
                                                        <TvOutlined />
                                                    )}
                                                </div>
                                                <div className='khylo-search-result-item__meta'>
                                                    <div className='khylo-search-result-item__title'>{item.Name}</div>
                                                    <div className='khylo-search-result-item__sub'>
                                                        {item.SeriesName ? `${item.SeriesName} · S${item.ParentIndexNumber} E${item.IndexNumber}` : 'Episode'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {audio.length > 0 && (
                                <div className='khylo-search-category'>
                                    <div className='khylo-search-category__title'>
                                        <HeadphonesOutlined /> Music ({audio.length})
                                    </div>
                                    <div className='khylo-search-category__grid'>
                                        {audio.map(item => (
                                            <div
                                                key={item.Id}
                                                className='khylo-search-result-item'
                                                onClick={() => handleSelectResult(item)}
                                                role='button'
                                                tabIndex={0}
                                            >
                                                <div className='khylo-search-result-item__poster khylo-search-result-item__poster--square'>
                                                    {getItemImageUrl(item) ? (
                                                        <img src={getItemImageUrl(item)!} alt={item.Name ?? ''} />
                                                    ) : (
                                                        <HeadphonesOutlined />
                                                    )}
                                                </div>
                                                <div className='khylo-search-result-item__meta'>
                                                    <div className='khylo-search-result-item__title'>{item.Name}</div>
                                                    <div className='khylo-search-result-item__sub'>
                                                        {item.AlbumArtist || item.Artists?.[0] || 'Music'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {books.length > 0 && (
                                <div className='khylo-search-category'>
                                    <div className='khylo-search-category__title'>
                                        <MenuBookOutlined /> Books ({books.length})
                                    </div>
                                    <div className='khylo-search-category__grid'>
                                        {books.map(item => (
                                            <div
                                                key={item.Id}
                                                className='khylo-search-result-item'
                                                onClick={() => handleSelectResult(item)}
                                                role='button'
                                                tabIndex={0}
                                            >
                                                <div className='khylo-search-result-item__poster'>
                                                    {getItemImageUrl(item) ? (
                                                        <img src={getItemImageUrl(item)!} alt={item.Name ?? ''} />
                                                    ) : (
                                                        <MenuBookOutlined />
                                                    )}
                                                </div>
                                                <div className='khylo-search-result-item__meta'>
                                                    <div className='khylo-search-result-item__title'>{item.Name}</div>
                                                    <div className='khylo-search-result-item__sub'>
                                                        {item.SeriesName || 'Book'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
