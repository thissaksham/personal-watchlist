import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { calculateMediaRuntime, type TMDBMedia } from '../lib/tmdb';
import { useWatchlist } from '../features/watchlist/context/WatchlistContext';
import { usePreferences } from '../context/PreferencesContext';
import { WatchlistCard } from '../features/media/components/cards/WatchlistCard';
import { MovieModal } from '../features/movies/components/MovieModal';
import { ShowModal } from '../features/shows/components/ShowModal';
import type { WatchlistItem } from '../types';

import { FAB } from '../components/FAB';
import { FilterBar, FilterExpandable } from '../components/FilterBar';

import { HistoryCard } from '../features/media/components/cards/HistoryCard';
import { SlidingToggle } from '../components/ui/SlidingToggle';
import { SmartPillButton } from '../components/ui/SmartPillButton';
import { Search, ListFilter, Undo2 } from 'lucide-react';

interface LibraryPageProps {
    title: string;
    subtitle: string;
    watchlistType: 'movie' | 'show';
    tmdbType: 'movie' | 'tv';
    emptyMessage: string;
    basePath?: string; // Enable URL-sync mode
}

export const LibraryPage = ({ title, subtitle, watchlistType, tmdbType, emptyMessage, basePath }: LibraryPageProps) => {
    const { watchlist, removeFromWatchlist, markAsDropped, markAsWatched, markAsUnwatched, restoreFromDropped, restoreToUpcoming } = useWatchlist();
    const { region } = usePreferences();
    const navigate = useNavigate();
    const params = useParams();

    const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
    const [filterProvider, setFilterProvider] = useState<number | null>(null);

    // Initialize viewMode from URL if basePath is set, else default
    const getInitialViewMode = () => {
        if (basePath && params.status) {
            const s = params.status.toLowerCase();
            if (s === 'finished' || s === 'ongoing') return 'Unwatched';
            if (s === 'dropped') return 'Dropped';
            return s.charAt(0).toUpperCase() + s.slice(1);
        }
        return 'Unwatched';
    };

    const [viewMode, setViewMode] = useState<string>(getInitialViewMode());

    // Initialize seriesStatus from URL
    const [seriesStatusFilter, setSeriesStatusFilter] = useState<string>(() => {
        if (basePath && params.status) {
            const s = params.status.toLowerCase();
            if (s === 'finished') return 'Finished';
            if (s === 'ongoing') return 'Ongoing';
        }
        return 'Finished';
    });

    // Sync URL changes to State
    useEffect(() => {
        if (basePath) {
            // Redirect Logic for TV Shows: Root or 'unwatched' -> 'finished'


            if (params.status) {
                const s = params.status.toLowerCase();
                if (s === 'finished') {
                    setViewMode('Unwatched');
                    setSeriesStatusFilter('Finished');
                } else if (s === 'ongoing') {
                    setViewMode('Unwatched');
                    setSeriesStatusFilter('Ongoing');
                } else if (s === 'dropped') {
                    setViewMode('Dropped');
                } else {
                    const mode = s.charAt(0).toUpperCase() + s.slice(1);
                    if (mode !== viewMode) setViewMode(mode);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [basePath, params.status, tmdbType, navigate]); // viewMode omitted intentionally to avoid loop

    const handleViewModeChange = (opt: string) => {
        if (basePath) {
            // For TV Shows, if switching to Unwatched, go to specific status
            if (tmdbType === 'tv' && opt === 'Unwatched') {
                navigate(`${basePath}/${seriesStatusFilter.toLowerCase()}`);
            } else {
                navigate(`${basePath}/${opt.toLowerCase()}`);
            }
        } else {
            setViewMode(opt);
        }
    };

    const handleSeriesStatusChange = (status: string) => {
        if (basePath) {
            navigate(`${basePath}/${status.toLowerCase()}`);
        } else {
            setSeriesStatusFilter(status);
        }
    };

    const [sortOption, setSortOption] = useState<'date_added' | 'rating' | 'release_date' | 'runtime' | 'random'>('random'); // Default Random Sort
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const sortRef = useRef<HTMLDivElement>(null);

    // Sync browser tab title
    useEffect(() => {
        document.title = `CineTrack | ${title}`;
    }, [title]);

    const isSortDisabled = tmdbType === 'tv' && viewMode === 'Watching';

    // Force "Release Date" sort when disabled (Watching Shows)
    useEffect(() => {
        if (isSortDisabled) {
            setSortOption('release_date');
            setIsSortOpen(false);
        }
    }, [isSortDisabled]);

    // Close sort menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setIsSortOpen(false);
            }
        };

        if (isSortOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSortOpen]);

    // Helper to determine Show status based on V3 logic
    const getShowStatus = (item: WatchlistItem): 'Unwatched' | 'Watching' | 'Watched' | 'Upcoming' => {
        const s = item.status;
        if (s === 'show_watched' || s === 'show_returning' || s === 'movie_watched') return 'Watched'; // Include movie_watched just in case
        if (s === 'show_watching') return 'Watching';
        if (s === 'show_new') return 'Upcoming';

        // show_finished, show_ongoing, movie_unwatched
        // Note: 'Upcoming' page handles show_new/show_coming_soon.
        return 'Unwatched';
    };

    // Filter from watchlist based on type and status
    const library = useMemo(() => watchlist
        .filter(item => {
            if (item.type !== watchlistType) return false;

            // GLOBAL SEARCH OVERRIDE: 
            // If searching, show EVERYTHING of this type that matches the term.
            // visual filters (grayscale/redscale) will indicate status.
            if (searchTerm) return true;

            // Normal View Mode Logic (No Search)
            // Handle Dropped View explicitly first
            if (viewMode === 'Dropped') {
                if (tmdbType === 'tv') return item.status === 'show_dropped';
                return item.status === 'movie_dropped';
            }

            // For all other views, explicitly EXCLUDE dropped items
            if (item.status === 'show_dropped' || item.status === 'movie_dropped') return false;

            // Logic for Shows (Derived)
            if (tmdbType === 'tv') {
                const derivedStatus = getShowStatus(item);
                return derivedStatus === viewMode;
            }

            // Logic for Movies (Manual)
            if (viewMode === 'Unwatched') {
                return item.status === 'movie_unwatched';
            }

            if (viewMode === 'Watched') return item.status === 'movie_watched';

            return false;
        })

        .map(item => ({
            ...(item.metadata || {}), // Load full metadata if available
            id: Number(item.tmdb_id),
            media_type: tmdbType,
            // Map title correctly. 'movie' uses title, 'tv' uses name. 
            // WatchlistItem always stores 'title'.
            [tmdbType === 'movie' ? 'title' : 'name']: item.title,
            poster_path: item.poster_path,
            vote_average: item.vote_average,
            status: item.status, // PASS STATUS FOR VISUAL FILTERS
            tmdb_status: (item.metadata as TMDBMedia)?.status // Preserve TMDB status for logic
        } as TMDBMedia)), [watchlist, watchlistType, tmdbType, searchTerm, viewMode]);

    // Extract unique providers sorted by popularity
    const allProviders = useMemo(() => {
        interface Provider { id: number; name: string; logo?: string; count: number; merged_ids?: number[] }
        const providers = new Map<number, Provider>();
        let hasNoProvider = false;

        // Context-Aware Filter: Valid providers should only come from items VISIBLE in the current tab context
        const contextLibrary = library.filter(media => {
            if (tmdbType === 'tv' && viewMode === 'Unwatched') {
                const status = media.tmdb_status || media.status || ''; // TMDB status (use preserved one first)
                const isFinished = (status === 'Ended' || status === 'Canceled' || status === 'Miniseries' || media.type === 'Miniseries') && status !== 'Returning Series';

                if (seriesStatusFilter === 'Finished' && !isFinished) return false;
                if (seriesStatusFilter === 'Ongoing' && isFinished) return false;
            }
            return true;
        });

        contextLibrary.forEach(media => {
            const providerData = media['watch/providers']?.results?.[region];
            if (!providerData) {
                hasNoProvider = true;
                return;
            }

            const available = [
                ...(providerData.flatrate || []),
                ...(providerData.free || []),
                ...(providerData.ads || [])
            ];

            if (available.length === 0) {
                hasNoProvider = true;
            } else {
                // Use a Set to ensure we only count a provider once *per media item*
                const uniqueMediaProviders = new Set<number>();
                available.forEach(p => {
                    uniqueMediaProviders.add(p.provider_id);
                    if (!providers.has(p.provider_id)) {
                        const logoUrl = p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : undefined;
                        providers.set(p.provider_id, { id: p.provider_id, name: p.provider_name, logo: logoUrl, count: 0 });
                    }
                });

                uniqueMediaProviders.forEach(pid => {
                    const existing = providers.get(pid)!;
                    existing.count += 1;
                });
            }
        });

        const result = Array.from(providers.values());

        // SMART MERGE LOGIC (Generic)
        // 1. Group providers by a "Normalized Name"
        //    (e.g. "Lionsgate Play Amazon Channel" -> "Lionsgate Play")
        const groups = new Map<string, typeof result>();

        const normalize = (name: string) => {
            // Specific overrides
            if (name === 'Amazon MX Player') return 'MX Player';
            if (name === 'Plex Channel') return 'Plex';

            return name
                .replace(/ Amazon Channel/i, '')
                .replace(/ Apple TV Channel/i, '')
                .replace(/ with Ads/i, '')
                .trim();
        };

        result.forEach(p => {
            const normal = normalize(p.name);
            if (!groups.has(normal)) groups.set(normal, []);
            groups.get(normal)!.push(p);
        });

        const finalProviders: typeof result = [];

        groups.forEach((group, normalName) => {
            if (group.length === 1) {
                // Scenario: Only "Eros Now Select Apple TV Channel" exists -> Keep as is
                finalProviders.push(group[0]);
            } else {
                // Scenario: "Lionsgate Play" AND "Lionsgate Play Amazon Channel" exist
                // Merge into the "Parent" (shortest name usually, or the one matching normalName)

                // Find a "Main" provider if it exists (exact match to normal name)
                let main = group.find(p => p.name === normalName);

                if (!main) {
                    main = group[0];
                }

                // Sum counts
                const totalCount = group.reduce((sum, p) => sum + p.count, 0);

                finalProviders.push({
                    ...main,
                    name: group.some(p => p.name === normalName) ? normalName : main.name, // Use pretty name if available
                    count: totalCount,
                    merged_ids: group.map(p => p.id)
                });
            }
        });

        // Sort by count
        finalProviders.sort((a, b) => b.count - a.count);

        if (hasNoProvider) {
            finalProviders.push({ id: -1, name: 'Not Streaming', logo: '/ext-logo.png', count: 0 });
        }
        return finalProviders;
    }, [library, region, seriesStatusFilter, tmdbType, viewMode]);


    const filteredLibrary = useMemo(() => library.filter(media => {
        // 1. Search Filter (Local)
        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            const title = media.title || media.name || '';
            if (!title.toLowerCase().includes(query)) return false;
        }

        // 2. Status Filter (TV Only)
        // 'Ended' or 'Canceled' -> Finished
        // 'Returning Series' -> Ongoing
        if (tmdbType === 'tv' && viewMode === 'Unwatched') {
            const status = media.tmdb_status || media.status || '';
            const isFinished = (status === 'Ended' || status === 'Canceled' || status === 'Miniseries' || media.type === 'Miniseries') && status !== 'Returning Series';

            if (seriesStatusFilter === 'Finished' && !isFinished) return false;
            if (seriesStatusFilter === 'Ongoing' && isFinished) return false;
        }

        // 3. Provider Filter (Updated for Smart Merging)
        if (filterProvider) {
            const providerData = media['watch/providers']?.results?.[region];
            if (!providerData) return filterProvider === -1;

            const available = [
                ...(providerData.flatrate || []),
                ...(providerData.free || []),
                ...(providerData.ads || [])
            ];

            if (filterProvider === -1) {
                return available.length === 0;
            }

            // Find the selected provider object from our smart list
            // We use 'allProviders' here which is defined above.
            const selectedProviderObj = allProviders.find(p => p.id === filterProvider);

            if (selectedProviderObj && 'merged_ids' in selectedProviderObj && selectedProviderObj.merged_ids) {
                // If it's a merged group, match ANY of the IDs
                return available.some(p => (selectedProviderObj.merged_ids as number[]).includes(p.provider_id));
            } else {
                // Std match
                return available.some(p => p.provider_id === filterProvider);
            }
        }

        return true;
    }), [library, searchTerm, tmdbType, viewMode, seriesStatusFilter, filterProvider, region, allProviders]);

    // 4. Sort Filter
    const sortedLibrary = useMemo(() => {
        return [...filteredLibrary].sort((a, b) => { // Create copy to avoid mutating
            switch (sortOption) {
                case 'rating':
                    return (b.vote_average || 0) - (a.vote_average || 0);
                case 'release_date': {
                    // Special Logic for 'Watching' TV Shows: Sort by Next Episode Date (Pill Date)
                    if (tmdbType === 'tv' && viewMode === 'Watching') {
                        const getDate = (m: TMDBMedia) => {
                            if (m.next_episode_to_air?.air_date) return new Date(m.next_episode_to_air.air_date).getTime();
                            if (m.last_episode_to_air?.air_date) return new Date(m.last_episode_to_air.air_date).getTime();
                            return new Date(m.first_air_date || 0).getTime();
                        };
                        return getDate(a) - getDate(b); // Ascending (Earliest First: Yesterday -> Today -> Tomorrow)
                    }

                    const dateA = new Date(a.release_date || a.first_air_date || 0).getTime();
                    const dateB = new Date(b.release_date || b.first_air_date || 0).getTime();
                    return dateB - dateA; // Newest first
                }
                case 'runtime':
                    return calculateMediaRuntime(a) - calculateMediaRuntime(b); // Shortest first
                case 'random':
                    // Fisher-Yates Shuffle is not a comparator, handling separately below
                    return 0;
                case 'date_added':
                default:
                    return 0; // Default order
            }
        });
    }, [filteredLibrary, sortOption, tmdbType, viewMode]);

    // Apply Random Shuffle if selected
    // Note: We use a separate memo or effect if we want to avoid re-shuffling on every render, 
    // but putting it in the useMemo above is safer for consistency, except sort() expects a comparator.
    // Better approach: Transform the array fully.

    const finalDisplayLibrary = useMemo(() => {
        const result = [...sortedLibrary];
        if (sortOption === 'random') {
            // Fisher-Yates Shuffle
            for (let i = result.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [result[i], result[j]] = [result[j], result[i]];
            }
        }
        return result;
    }, [sortedLibrary, sortOption]);

    // Total Count Calculation for Debugging (User Request: "10/11")
    const totalCount = useMemo(() => {
        return watchlist.filter(item => {
            if (item.type !== watchlistType) return false;

            // Handle Dropped View explicitly first
            if (viewMode === 'Dropped') {
                if (tmdbType === 'tv') return item.status === 'show_dropped';
                return item.status === 'movie_dropped';
            }

            // For all other views, explicitly EXCLUDE dropped items
            if (item.status === 'show_dropped' || item.status === 'movie_dropped') return false;

            // Strict Status Matching to match ViewMode
            if (tmdbType === 'tv') {
                const visibleStatus = getShowStatus(item);
                if (visibleStatus !== viewMode) return false;

                // Extra check for Unwatched (Finished vs Ongoing filter)
                if (viewMode === 'Unwatched') {
                    const metadata = (item.metadata || {}) as TMDBMedia;
                    const tStatus = metadata.status || ''; // TMDB status
                    const isFinished = (tStatus === 'Ended' || tStatus === 'Canceled' || tStatus === 'Miniseries' || metadata.type === 'Miniseries') && tStatus !== 'Returning Series';

                    if (seriesStatusFilter === 'Finished' && !isFinished) return false;
                    if (seriesStatusFilter === 'Ongoing' && isFinished) return false;
                }
                return true;
            } else {
                if (viewMode === 'Unwatched') return item.status === 'movie_unwatched';
                if (viewMode === 'Watched') return item.status === 'movie_watched';
            }
            return false;
        }).length;
    }, [watchlist, watchlistType, tmdbType, viewMode, seriesStatusFilter]);

    return (
        <div>
            <div className="page-header flex justify-between items-end mb-6">
                <div>
                    <h1 className="page-title text-3xl font-bold flex items-baseline">
                        {title}
                        <span style={{ fontSize: '0.9rem', opacity: 0.2, fontWeight: 'normal', marginLeft: '10px' }} className="select-none">
                            showing {sortedLibrary.length}/{totalCount} results
                        </span>
                    </h1>
                    <p className="subtitle text-gray-400 mt-1">{subtitle}</p>
                </div>

                <div
                    className="flex items-center"
                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '24px' }} // Increased gap and restored flex
                >
                    {/* Series Status Toggle (Finished vs Ongoing) - Shows Only */}
                    {tmdbType === 'tv' ? (
                        <SmartPillButton
                            viewMode={viewMode}
                            seriesStatus={seriesStatusFilter}
                            onViewModeChange={handleViewModeChange}
                            onSeriesStatusChange={handleSeriesStatusChange}
                        />
                    ) : (
                        /* View Mode Toggle (Movies) */
                        <SlidingToggle
                            options={['Unwatched', 'Watched', 'Dropped']}
                            activeOption={viewMode}
                            onToggle={handleViewModeChange}
                        />
                    )}

                    {/* Sort Dropdown */}
                    <div className="relative z-50" ref={sortRef} style={{ position: 'relative', marginRight: '8px' }}>
                        <button
                            className={`pill filter-trigger gap-2 transition-colors ${isSortOpen ? 'bg-white/10 text-white active' : 'hover:bg-white/10'} ${isSortDisabled ? 'opacity-50' : ''}`}
                            onClick={() => !isSortDisabled && setIsSortOpen(!isSortOpen)}
                            disabled={isSortDisabled}
                            style={{ whiteSpace: 'nowrap', cursor: isSortDisabled ? 'default' : 'pointer' }}
                        >
                            <span className="text-sm font-medium">Sort</span>
                            <ListFilter size={16} />
                        </button>

                        {isSortOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '8px',
                                    zIndex: 1000,
                                    minWidth: '220px'
                                }}
                                className="animate-in fade-in slide-in-from-top-2 duration-200"
                            >
                                <div
                                    style={{
                                        backgroundColor: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '4px',
                                        width: '100%',
                                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px'
                                    }}
                                >
                                    {[
                                        { id: 'date_added', label: 'Date Added' },
                                        { id: 'rating', label: 'Highest Rated' },
                                        { id: 'release_date', label: 'Newest Release' },
                                        { id: 'runtime', label: 'Shortest Runtime' },
                                        { id: 'random', label: 'Random Shuffle' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => {
                                                setSortOption(opt.id as 'date_added' | 'rating' | 'release_date' | 'runtime' | 'random');
                                                setIsSortOpen(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '10px 12px',
                                                fontSize: '14px',
                                                borderRadius: '8px',
                                                backgroundColor: sortOption === opt.id ? 'var(--primary)' : 'transparent',
                                                color: sortOption === opt.id ? 'white' : 'var(--text-secondary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s',
                                                fontWeight: sortOption === opt.id ? '600' : '400'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (sortOption !== opt.id) {
                                                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                                                    e.currentTarget.style.color = 'var(--text-primary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (sortOption !== opt.id) {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                                }
                                            }}
                                        >
                                            {opt.label}
                                            {sortOption === opt.id && (
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 0 8px rgba(255,255,255,0.5)' }} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Local Search Input */}
                    <div className="search-bar" style={{ position: 'relative', width: '250px' }}>
                        <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder={`Search ${title}...`}
                            className="search-input"
                            style={{ width: '100%' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Filter Bar (Glassmorphism) */}
            <FilterBar>

                {/* Status Filter removed - moved to header toggle */}

                {/* OTT Filter */}
                {allProviders.length > 0 && (
                    <FilterExpandable
                        label="OTT"
                        value={filterProvider}
                        onChange={(val) => setFilterProvider(typeof val === 'number' ? val : null)}
                        options={allProviders.map(p => ({
                            id: p.id,
                            label: p.name,
                            image: p.logo || undefined // Pass logo path
                        }))}
                    />
                )}
            </FilterBar>

            {
                sortedLibrary.length === 0 ? (
                    <div className="u-full-center py-20 u-vstack text-center">
                        <p className="u-text-gray">
                            {filterProvider ? "No items found for this provider." : emptyMessage}
                        </p>
                        <p className="subtitle-text">Click the + button to add one!</p>
                    </div>
                ) : (
                    <div className="media-grid">
                        {finalDisplayLibrary.map((media) => (
                            <div key={media.id}>
                                {viewMode === 'Watched' ? (
                                    <HistoryCard
                                        media={media}
                                        onRemove={(m) => {
                                            const displayTitle = m.title || m.name;
                                            if (window.confirm(`Are you sure you want to remove "${displayTitle}" from your history?`)) {
                                                removeFromWatchlist(Number(m.id), watchlistType);
                                            }
                                        }}
                                        onUnwatch={(m) => {
                                            markAsUnwatched(Number(m.id), watchlistType);
                                        }}
                                        onRestoreToUpcoming={(m) => restoreToUpcoming(Number(m.id), watchlistType)}
                                        onClick={() => setSelectedMedia(media)}
                                    />
                                ) : (
                                    <WatchlistCard
                                        media={media}
                                        type={tmdbType}
                                        isDropped={media.status === 'movie_dropped' || media.status === 'show_dropped'} // Dynamic check for search results
                                        actionLabel={(media.status === 'movie_dropped' || media.status === 'show_dropped') ? "Restore to Library" : "Mark as Watched"}
                                        actionIcon={(media.status === 'movie_dropped' || media.status === 'show_dropped') ? <Undo2 size={16} /> : undefined}
                                        onRemove={(m) => {
                                            const displayTitle = m.title || m.name;
                                            if (m.status === 'movie_dropped' || m.status === 'show_dropped') {
                                                // Permanent Delete
                                                if (window.confirm(`PERMANENTLY DELETE "${displayTitle}"? This cannot be undone.`)) {
                                                    removeFromWatchlist(Number(m.id), watchlistType);
                                                }
                                            } else {
                                                // Drop (Move to Dropped)
                                                if (window.confirm(`Drop "${displayTitle}"? It will be moved to the Dropped section.`)) {
                                                    markAsDropped(Number(m.id), watchlistType);
                                                }
                                            }
                                        }}
                                        removeLabel={(media.status === 'movie_dropped' || media.status === 'show_dropped') ? "Delete Permanently" : "Drop (Move to Dropped)"}
                                        // Optional: customize icon logic here if desired, but default X is fine for Drop.
                                        onMarkWatched={(m) => {
                                            // Restoration logic if dropped, or just mark watched
                                            if (m.status === 'movie_dropped' || m.status === 'show_dropped') {
                                                const displayTitle = m.title || m.name;
                                                if (window.confirm(`Restore ${displayTitle} to your library?`)) {
                                                    // Re-using restore logic or just mark unwatched/watched? User usually wants restore.
                                                    // Let's assume restore = markAsUnwatched (or upcoming logic).
                                                    // But the prompt in dropped page was 'restoreFromDropped'. 
                                                    // useWatchlist hook has restoreFromDropped.
                                                    // Let's use that if available or just markAsUnwatched.
                                                    // Check context file? Assume markAsUnwatched works for now or check usage.
                                                    restoreFromDropped(Number(m.id), watchlistType);
                                                }
                                            } else {
                                                markAsWatched(Number(m.id), watchlistType);
                                            }
                                        }}
                                        onMarkUnwatched={media.status === 'show_watching' ? (m) => { // Only show unwatched/undo if actively watching? Or for everything?
                                            markAsUnwatched(Number(m.id), watchlistType);
                                        } : undefined}
                                        onRestoreToUpcoming={(m) => restoreToUpcoming(Number(m.id), watchlistType)}
                                        onClick={() => setSelectedMedia(media)}
                                        showContextLabel={
                                            viewMode === 'Watching'
                                                ? (media.tmdb_status !== 'Ended' && media.tmdb_status !== 'Canceled')
                                                : (viewMode === 'Upcoming')
                                        }
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )
            }

            <FAB
                mode="random"
                onRandom={() => {
                    const pool = filteredLibrary.length > 0 ? filteredLibrary : library;
                    if (pool.length > 0) {
                        const randomItem = pool[Math.floor(Math.random() * pool.length)];
                        setSelectedMedia(randomItem);
                    } else {
                        alert("Add some items first!");
                    }
                }}
            />


            {
                selectedMedia && (
                    tmdbType === 'tv' ? (
                        <ShowModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
                    ) : (
                        <MovieModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
                    )
                )
            }
        </div >
    );
};
