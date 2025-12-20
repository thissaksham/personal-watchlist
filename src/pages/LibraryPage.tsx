import { useState, useMemo, useRef, useEffect } from 'react';
import { calculateMediaRuntime } from '../lib/tmdb';
import { useWatchlist } from '../context/WatchlistContext';
import { MediaCard } from '../components/MediaCard';
import { MediaDetailsModal } from '../components/MediaDetailsModal';
import { SearchModal } from '../components/SearchModal';
import { FAB } from '../components/FAB';
import { FilterBar, FilterExpandable } from '../components/FilterBar';
import { Search, ListFilter } from 'lucide-react';
import type { TMDBMedia } from '../lib/tmdb';

interface LibraryPageProps {
    title: string;
    subtitle: string;
    watchlistType: 'movie' | 'show';
    tmdbType: 'movie' | 'tv';
    emptyMessage: string;
}

export const LibraryPage = ({ title, subtitle, watchlistType, tmdbType, emptyMessage }: LibraryPageProps) => {
    const { watchlist, removeFromWatchlist, markAsWatched } = useWatchlist();
    const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [filterProvider, setFilterProvider] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState<'finished' | 'ongoing' | null>(null);
    const [sortOption, setSortOption] = useState<'date_added' | 'rating' | 'release_date' | 'runtime'>('date_added'); // New Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

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

    // Filter from watchlist based on type and status (Plan to Watch only)
    const library = watchlist
        .filter(item => item.type === watchlistType && item.status !== 'watched')
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

    // Extract unique providers
    const allProviders = useMemo(() => {
        const providers = new Map();
        let hasNoProvider = false;

        library.forEach(media => {
            // @ts-ignore - dynamic property access
            // Strict IN only - no fallback to US
            const providerData = media['watch/providers']?.results?.['IN'];
            const flatrate = providerData?.flatrate || [];

            if (flatrate.length === 0) {
                hasNoProvider = true;
            } else {
                flatrate.forEach((p: any) => {
                    if (!providers.has(p.provider_id)) {
                        const logoUrl = p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : undefined;
                        providers.set(p.provider_id, { id: p.provider_id, name: p.provider_name, logo: logoUrl });
                    }
                });
            }
        });

        const result: any[] = Array.from(providers.values());

        // Remove "Amazon Prime Video with Ads" if "Amazon Prime Video" is also present
        const primeVideo = result.find(p => p.name === 'Amazon Prime Video');
        const primeVideoAds = result.find(p => p.name === 'Amazon Prime Video with Ads');

        if (primeVideo && primeVideoAds) {
            const index = result.findIndex(p => p.id === primeVideoAds.id);
            if (index > -1) result.splice(index, 1);
        }

        if (hasNoProvider) {
            result.push({ id: -1, name: 'Not Streaming', logo: '/ext-logo.png' });
        }
        return result;
    }, [library]);


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
        if (tmdbType === 'tv' && statusFilter) {
            const status = media.status || '';
            const isFinished = status === 'Ended' || status === 'Canceled';

            if (statusFilter === 'finished' && !isFinished) return false;
            if (statusFilter === 'ongoing' && isFinished) return false;
            // Note: 'ongoing' will include 'Returning Series', 'Pilot', 'In Production' etc.
        }

        // 3. Provider Filter
        if (filterProvider) {
            // @ts-ignore
            const providerData = media['watch/providers']?.results?.['IN'];
            const flatrate = providerData?.flatrate || [];

            if (filterProvider === -1) {
                return flatrate.length === 0;
            }
            return flatrate.some((p: any) => p.provider_id === filterProvider);
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

    return (
        <div>
            <div className="page-header flex justify-between items-end mb-6">
                <div>
                    <h1 className="page-title text-3xl font-bold">{title}</h1>
                    <p className="subtitle text-gray-400 mt-1">{subtitle}</p>
                </div>

                <div
                    className="flex items-center gap-4"
                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' }}
                >
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

                {/* Status Filter (Shows only) - Hide if library is empty */}
                {library.length > 0 && tmdbType === 'tv' && (
                    <FilterExpandable
                        label="Status"
                        value={statusFilter}
                        onChange={(val: any) => setStatusFilter(val)}
                        options={[
                            { id: 'finished', label: 'Finished' },
                            { id: 'ongoing', label: 'Ongoing' }
                        ]}
                    />
                )}

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
                            <div key={media.id} onClick={() => setSelectedMedia(media)}>
                                <MediaCard
                                    media={media}
                                    type={tmdbType}
                                    onRemove={(m) => {
                                        const displayTitle = m.title || m.name;
                                        if (window.confirm(`Are you sure you want to remove "${displayTitle}" from your library?`)) {
                                            removeFromWatchlist(Number(m.id), watchlistType);
                                        }
                                    }}
                                    onMarkWatched={(m) => {
                                        // Assuming we can import markAsWatched or use context
                                        // Luckily we have useWatchlist inside LibraryPage
                                        markAsWatched(Number(m.id), watchlistType);
                                    }}
                                    // Config based on type
                                    showSeasons={tmdbType === 'tv'} // Only show seasons for TV
                                    showDuration={true}
                                    showRating={true}
                                    showYear={true}
                                />
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Random Pick Logic */}
            <FAB
                onClick={() => setIsSearchOpen(true)}
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
                isSearchOpen && (
                    <SearchModal
                        isOpen={isSearchOpen}
                        onClose={() => setIsSearchOpen(false)}
                        type={tmdbType}
                    />
                )
            }

            {
                selectedMedia && (
                    <MediaDetailsModal
                        media={selectedMedia}
                        type={tmdbType}
                        onClose={() => setSelectedMedia(null)}
                        onAdd={() => removeFromWatchlist(selectedMedia.id, watchlistType)}
                        isInWatchlist={true}
                    />
                )
            }
        </div >
    );
};
