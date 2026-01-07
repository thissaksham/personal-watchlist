import { useEffect, useState, useMemo } from 'react';
import { WatchlistCard } from '../features/media/components/cards/WatchlistCard';
import { MovieModal } from '../features/movies/components/MovieModal';
import { ShowModal } from '../features/shows/components/ShowModal';
import { useWatchlist } from '../features/watchlist/context/WatchlistContext';
import { type TMDBMedia } from '../lib/tmdb';
import { FilterBar, FilterExpandable } from '../components/FilterBar';
import { useMediaProviders } from '../features/media/hooks/useMediaProviders';
import { usePreferences } from '../context/PreferencesContext';

export const Watchlist = () => {
    const { watchlist, removeFromWatchlist, markAsWatched, restoreToUpcoming } = useWatchlist();
    const { region } = usePreferences();
    const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
    const [enrichedWatchlist, setEnrichedWatchlist] = useState<TMDBMedia[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [filterProvider, setFilterProvider] = useState<number | null>(null);

    useEffect(() => {
        const loadWatchlistData = async () => {
            setLoading(true);
            try {
                console.log("Watchlist Page: Loading data...");
                console.log("Raw Watchlist:", watchlist);
                const unwatched = watchlist.filter(item => ['movie_unwatched', 'show_ongoing', 'show_watching'].includes(item.status));
                console.log("Unwatched Items:", unwatched);

                const items = unwatched
                    .map(item => {
                        const media = (item.metadata || {}) as TMDBMedia;
                        return {
                            ...media,
                            id: item.tmdb_id,
                            media_type: item.type,
                            title: item.title || media.title || media.name,
                            name: item.title || media.name || media.title,
                            poster_path: item.poster_path || media.poster_path,
                            vote_average: item.vote_average || media.vote_average
                        } as TMDBMedia;
                    });

                setEnrichedWatchlist(items);
            } catch (err) {
                console.error("Failed to load watchlist", err);
            } finally {
                setLoading(false);
            }
        };

        loadWatchlistData();
    }, [watchlist]);

    // Extract Providers
    const allProviders = useMediaProviders(enrichedWatchlist, region);

    console.log('DEBUG: Enriched Watchlist:', enrichedWatchlist);

    // Apply Filters
    const filteredList = useMemo(() => {
        return enrichedWatchlist.filter(media => {
            if (filterProvider) {
                const providerData = media['watch/providers']?.results?.[region];
                const flatrate = providerData?.flatrate || [];
                if (filterProvider === -1) return flatrate.length === 0;
                return flatrate.some((p: { provider_id: number }) => p.provider_id === filterProvider);
            }
            return true;
        });
    }, [enrichedWatchlist, filterProvider, region]);

    console.log('DEBUG: Filtered List:', filteredList);

    const handleRemove = async (mediaId: number, type: 'movie' | 'show') => {
        await removeFromWatchlist(mediaId, type);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">My Watchlist</h1>
                    <p className="subtitle">Your personalized library of movies and shows.</p>
                </div>
            </div>

            {/* Filter Bar */}
            <FilterBar>
                <FilterExpandable
                    label="OTT"
                    value={filterProvider}
                    onChange={(val) => setFilterProvider(typeof val === 'number' ? val : null)}
                    options={allProviders.map(p => ({
                        id: p.id,
                        label: p.name,
                        image: p.logo || undefined
                    }))}
                />
            </FilterBar>

            {loading ? (
                <div className="media-grid">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="media-card" style={{ height: '300px', backgroundColor: '#2a2a2a' }} />
                    ))}
                </div>
            ) : filteredList.length === 0 ? (
                <div className="u-full-center py-20 u-vstack text-center">
                    <p className="u-text-gray">
                        {filterProvider ? "No items match this filter." : "Your watchlist is empty."}
                    </p>
                    {!filterProvider && <p className="subtitle-text">Go find some movies or shows to add!</p>}
                </div>
            ) : (
                <div className="media-grid">
                    {filteredList.map((media) => (
                        <div key={`${media.media_type}-${media.id}`}>
                            <WatchlistCard
                                media={media}
                                type={media.media_type as 'movie' | 'tv'}
                                onRemove={() => handleRemove(media.id, media.media_type === 'movie' ? 'movie' : 'show')}
                                onMarkWatched={() => markAsWatched(media.id, media.media_type === 'movie' ? 'movie' : 'show')}
                                onRestoreToUpcoming={() => restoreToUpcoming(media.id, media.media_type === 'movie' ? 'movie' : 'show')}
                                onClick={() => setSelectedMedia(media)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {selectedMedia && (
                selectedMedia.media_type === 'tv' ? (
                    <ShowModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
                ) : (
                    <MovieModal media={selectedMedia} onClose={() => setSelectedMedia(null)} />
                )
            )}
        </div>
    );
};
