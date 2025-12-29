import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { calculateMediaRuntime, type TMDBMedia } from '../lib/tmdb';
import { useWatchlist } from '../context/WatchlistContext';
import { usePreferences } from '../context/PreferencesContext';
import { WatchlistCard } from '../components/cards/WatchlistCard';
import { MovieModal } from '../components/modals/MovieModal';
import { ShowModal } from '../components/modals/ShowModal';

import { FAB } from '../components/FAB';
import { FilterBar, FilterExpandable } from '../components/FilterBar';

import { HistoryCard } from '../components/cards/HistoryCard';
import { SlidingToggle } from '../components/common/SlidingToggle';
import { SmartPillButton } from '../components/common/SmartPillButton';
import { Search, ListFilter } from 'lucide-react';

interface LibraryPageProps {
    title: string;
    subtitle: string;
    watchlistType: 'movie' | 'show';
    tmdbType: 'movie' | 'tv';
    emptyMessage: string;
    basePath?: string; // Enable URL-sync mode
}

export const LibraryPage = ({ title, subtitle, watchlistType, tmdbType, emptyMessage, basePath }: LibraryPageProps) => {
    const { watchlist, removeFromWatchlist, markAsDropped, markAsWatched, markAsUnwatched, restoreToUpcoming } = useWatchlist();
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
            if (tmdbType === 'tv') {
                if (!params.status || params.status.toLowerCase() === 'unwatched') {
                    navigate(`${basePath}/finished`, { replace: true });
                    return;
                }
            }

            if (params.status) {
                const s = params.status.toLowerCase();
                if (s === 'finished') {
                    setViewMode('Unwatched');
                    setSeriesStatusFilter('Finished');
                } else if (s === 'ongoing') {
                    setViewMode('Unwatched');
                    setSeriesStatusFilter('Ongoing');
                } else {
                    const mode = s.charAt(0).toUpperCase() + s.slice(1);
                    if (mode !== viewMode) setViewMode(mode);
                }
            }
        }
    }, [basePath, params.status, tmdbType, navigate]); // Added dependencies

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

    const [sortOption, setSortOption] = useState<'date_added' | 'rating' | 'release_date' | 'runtime'>('date_added'); // New Sort State
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const sortRef = useRef<HTMLDivElement>(null);

    // Sync browser tab title
    useEffect(() => {
        document.title = `CineTrack | ${title}`;
    }, [title]);

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
    const getShowStatus = (item: any): 'Unwatched' | 'Watching' | 'Watched' | 'Upcoming' => {
        const s = item.status;
        if (s === 'show_watched' || s === 'show_returning' || s === 'movie_watched') return 'Watched'; // Include movie_watched just in case
        if (s === 'show_watching') return 'Watching';
        if (s === 'show_new') return 'Upcoming';

        // show_finished, show_ongoing, movie_unwatched
        // Note: 'Upcoming' page handles show_new/show_coming_soon.
        return 'Unwatched';
    };

    // Filter from watchlist based on type and status
    const library = watchlist
        .filter(item => {
            if (item.type !== watchlistType) return false;
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
            vote_average: item.vote_average
        } as TMDBMedia));

    // Extract unique providers sorted by popularity
    const allProviders = useMemo(() => {
        const providers = new Map<number, { id: number; name: string; logo?: string; count: number }>();
        let hasNoProvider = false;

        library.forEach(media => {
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
                available.forEach((p: any) => {
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

        let result = Array.from(providers.values());

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

                // If no exact parent (e.g. only "X Amazon" and "X Apple"), pick the first one or create a composite?
                // User logic: "Merge into single Lionsgate channel". 
                // We'll prioritize the one that matches the normalized name. 
                // If distinct variants exist without a parent, we might still want to merge them?
                // User said: "Lionsgate Play" + "Lionsgate Play Apple" -> Merge. 
                // The prompt implies we want to see "Lionsgate Play".

                if (!main) {
                    // If we have "X Amazon" and "X Apple" but NO plain "X",
                    // usually we'd just want to report "X". 
                    // But to be safe and have a valid ID, we pick the first one 
                    // and arguably rename it to the Normal Name for the UI?
                    // User example 2: "Eros Now... Channel" -> Keep as is. (That was group.length === 1)

                    // If group.length > 1, we definitely merge.
                    main = group[0];
                    // Optional: Rename for display? 
                    // If we merge "Lionsgate Apple" and "Lionsgate Amazon", the filter should probably just say "Lionsgate".
                    // Let's rely on the existence of a "clean" parent or default to the normalized name for the Label?
                    // The Provider Object must trigger the ID.
                }

                // Sum counts
                const totalCount = group.reduce((sum, p) => sum + p.count, 0);

                // Create a merged entry. 
                // Problem: Filter ID. We can't query by multiple IDs easily with the current single-select logic unless we change filtering.
                // CURRENT FILTERING LOGIC (Line 230): p.provider_id === filterProvider.
                // If we merge, clicking "Lionsgate" (ID 123) won't show "Lionsgate Amazon" (ID 456).
                // WE MUST UPDATE THE FILTER LOGIC TOO if we merge IDs.

                // For now, let's assuming we pick the "Main" ID and hope the user has the main one? 
                // NO, that breaks filtering for the channel items.
                // We need to return a "Virtual Provider" or handle the filter check.

                // Actually, let's keep it simple: 
                // The filter logic needs to know which IDs belong to this "Display Item".
                // We'll attach a list of `mergedIds` to the provider object.

                finalProviders.push({
                    ...main,
                    name: group.some(p => p.name === normalName) ? normalName : main.name, // Use pretty name if available
                    count: totalCount,
                    // We need to pass ALL ids to the filter
                    // We'll verify if we can store extra props or if we need to hack it.
                    // The `allProviders` is used in the FilterBar. `FilterExpandable` takes `options`.
                    // We can embed the IDs in the ID field? No, ID expects number.

                    // Let's modify the filtering logic below first (Step 2).
                    // For this step, we'll assign the Main ID but we need a way to track the others.
                    // Let's add a `merged_ids` property.
                    merged_ids: group.map(p => p.id)
                } as any);
            }
        });

        // Sort by count
        finalProviders.sort((a, b) => b.count - a.count);

        if (hasNoProvider) {
            finalProviders.push({ id: -1, name: 'Not Streaming', logo: '/ext-logo.png', count: 0 });
        }
        return finalProviders;
    }, [library, region]);


    const filteredLibrary = library.filter(media => {
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
            const status = media.status || '';
            const isFinished = status === 'Ended' || status === 'Canceled';

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
            const selectedProviderObj = allProviders.find((p: any) => p.id === filterProvider) as any;

            if (selectedProviderObj && selectedProviderObj.merged_ids) {
                // If it's a merged group, match ANY of the IDs
                return available.some((p: any) => selectedProviderObj.merged_ids.includes(p.provider_id));
            } else {
                // Std match
                return available.some((p: any) => p.provider_id === filterProvider);
            }
        }

        return true;
    });

    // 4. Sort Filter
    const sortedLibrary = useMemo(() => {
        return [...filteredLibrary].sort((a, b) => { // Create copy to avoid mutating
            switch (sortOption) {
                case 'rating':
                    return (b.vote_average || 0) - (a.vote_average || 0);
                case 'release_date':
                    const dateA = new Date(a.release_date || a.first_air_date || 0).getTime();
                    const dateB = new Date(b.release_date || b.first_air_date || 0).getTime();
                    return dateB - dateA; // Newest first
                case 'runtime':
                    return calculateMediaRuntime(a) - calculateMediaRuntime(b); // Shortest first
                case 'date_added':
                default:
                    return 0; // Default order (usually date added if array order matches watchlist push)
            }
        });
    }, [filteredLibrary, sortOption]);

    // Total Count Calculation for Debugging (User Request: "10/11")
    const totalCount = useMemo(() => {
        return watchlist.filter(item => {
            if (item.type !== watchlistType) return false;
            if (item.status === 'show_dropped' || item.status === 'movie_dropped') return false;

            // Strict Status Matching to match ViewMode
            if (tmdbType === 'tv') {
                return getShowStatus(item) === viewMode;
            } else {
                if (viewMode === 'Unwatched') return item.status === 'movie_unwatched';
                if (viewMode === 'Watched') return item.status === 'movie_watched';
            }
            return false;
        }).length;
    }, [watchlist, watchlistType, tmdbType, viewMode]);

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
                            options={['Unwatched', 'Watched']}
                            activeOption={viewMode}
                            onToggle={handleViewModeChange}
                        />
                    )}

                    {/* Sort Dropdown */}
                    <div className="relative z-50" ref={sortRef} style={{ position: 'relative', marginRight: '8px' }}>
                        <button
                            className={`pill filter-trigger gap-2 transition-colors ${isSortOpen ? 'bg-white/10 text-white active' : 'hover:bg-white/10'}`}
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            style={{ whiteSpace: 'nowrap' }}
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
                                        { id: 'runtime', label: 'Shortest Runtime' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => {
                                                setSortOption(opt.id as any);
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
                        onChange={(val: any) => setFilterProvider(val)}
                        options={allProviders.map((p: any) => ({
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
                        {sortedLibrary.map((media) => (
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
                                        onRemove={(m) => {
                                            const displayTitle = m.title || m.name;
                                            if (window.confirm(`Drop "${displayTitle}"? It will be moved to the Dropped section.`)) {
                                                markAsDropped(Number(m.id), watchlistType);
                                            }
                                        }}
                                        removeLabel="Drop (Move to Dropped)"
                                        // Optional: customize icon logic here if desired, but default X is fine for Drop.
                                        onMarkWatched={(m) => {
                                            markAsWatched(Number(m.id), watchlistType);
                                        }}
                                        onMarkUnwatched={viewMode === 'Watching' ? (m) => {
                                            markAsUnwatched(Number(m.id), watchlistType);
                                        } : undefined}
                                        onRestoreToUpcoming={(m) => restoreToUpcoming(Number(m.id), watchlistType)}
                                        onClick={() => setSelectedMedia(media)}
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
