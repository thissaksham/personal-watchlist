import { Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useWatchlist } from '../context/WatchlistContext';
import { MediaCard } from '../components/MediaCard';
import { HistoryModal } from '../components/modals/HistoryModal';
import { FilterBar, FilterExpandable } from '../components/FilterBar';
import { Check } from 'lucide-react';
import type { TMDBMedia } from '../lib/tmdb';


export const WatchedPage = () => {
    const { watchlist, removeFromWatchlist, markAsUnwatched } = useWatchlist();
    const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
    const [viewType, setViewType] = useState<'movie' | 'show' | null>(null);
    const [filterProvider, setFilterProvider] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Get Base List (Watched + Type)
    const watchedItems = useMemo(() => {
        return watchlist
            .filter(item => item.status === 'watched' && (viewType === null || item.type === viewType))
            .map(item => ({
                ...(item.metadata || {}),
                id: Number(item.tmdb_id),
                media_type: item.type === 'show' ? 'tv' : 'movie',
                title: item.title,
                name: item.title, // Provide both for safety since we have mixed types
                poster_path: item.poster_path,
                vote_average: item.vote_average
            } as TMDBMedia));
    }, [watchlist, viewType]);

    // 2. Providers extraction (Optional/Future)
    // const allProviders = useMediaProviders(watchedItems);

    // 3. Apply Filters
    const filteredItems = useMemo(() => {
        return watchedItems.filter(media => {
            // 1. Search Filter
            if (searchTerm) {
                const query = searchTerm.toLowerCase();
                const title = media.title || media.name || '';
                if (!title.toLowerCase().includes(query)) return false;
            }

            /* if (filterProvider) {
                // @ts-ignore
                const providerData = media['watch/providers']?.results?.['IN'];
                const flatrate = providerData?.flatrate || [];
                if (filterProvider === -1) return flatrate.length === 0;
                return flatrate.some((p: any) => p.provider_id === filterProvider);
            } */
            return true;
        });
    }, [watchedItems, filterProvider, searchTerm]);


    const tmdbType = (viewType === 'show' || (!viewType && selectedMedia?.media_type === 'tv')) ? 'tv' : 'movie'; // Helper for modals if exact type unknown, but usually we use item's type

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Watched History</h1>
                    <p className="subtitle">Things you've already seen</p>
                </div>

                {/* Local Search Input */}
                <div className="search-bar" style={{ position: 'relative', width: '250px' }}>
                    <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder={`Search history...`}
                        className="search-input"
                        style={{ width: '100%' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Filter Bar - Hide if history is empty */}
            {watchlist.some(item => item.status === 'watched') && (
                <FilterBar>
                    <FilterExpandable
                        label="View"
                        value={viewType}
                        onChange={(val: any) => {
                            setViewType(val);
                            setFilterProvider(null); // Reset provided filter when switching type
                        }}
                        options={[
                            { id: 'movie', label: 'Movies' },
                            { id: 'show', label: 'Shows' },
                        ]}
                    />
                </FilterBar>
            )}

            {filteredItems.length === 0 ? (
                <div className="u-full-center py-20 u-vstack text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 mx-auto text-gray-500">
                        <Check size={32} />
                    </div>
                    <p className="u-text-gray">
                        {watchedItems.length === 0
                            ? `You haven't marked any items as watched yet.`
                            : "No items match this filter."}
                    </p>
                </div>
            ) : (
                <div className="media-grid">
                    {filteredItems.map((media) => (
                        <div key={media.id} onClick={() => setSelectedMedia(media)}>
                            <MediaCard
                                media={media}
                                type={tmdbType}
                                onRemove={(m) => {
                                    if (window.confirm(`Remove "${m.title || m.name}" from history?`)) {
                                        const type = m.media_type === 'tv' ? 'show' : 'movie';
                                        removeFromWatchlist(Number(m.id), type);
                                    }
                                }}
                                onUnwatch={(m) => {
                                    const type = m.media_type === 'tv' ? 'show' : 'movie';
                                    markAsUnwatched(Number(m.id), type);
                                }}
                                showRating={false}
                                showYear={false}
                                showDuration={false}
                                showSeasons={false}
                            />
                        </div>
                    ))}
                </div>
            )}

            {selectedMedia && (
                <HistoryModal
                    media={selectedMedia}
                    type={tmdbType}
                    onClose={() => setSelectedMedia(null)}
                />
            )}
        </div>
    );
};
