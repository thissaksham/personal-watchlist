import { useEffect, useState, useMemo } from 'react';
import { WatchlistCard } from '../components/cards/WatchlistCard';
import { WatchlistModal } from '../components/modals/WatchlistModal';
import { useWatchlist } from '../context/WatchlistContext';
import { type TMDBMedia, TMDB_REGION } from '../lib/tmdb';
import { FilterBar, FilterExpandable } from '../components/FilterBar';
import { useMediaProviders } from '../hooks/useMediaProviders';

export const Watchlist = () => {
    const { watchlist, removeFromWatchlist, markAsWatched } = useWatchlist();
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
                const unwatched = watchlist.filter(item => item.status === 'unwatched');
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
    const allProviders = useMediaProviders(enrichedWatchlist);

    console.log('DEBUG: Enriched Watchlist:', enrichedWatchlist);

    // Apply Filters
    const filteredList = useMemo(() => {
        return enrichedWatchlist.filter(media => {
            if (filterProvider) {
                // @ts-ignore
                const providerData = media['watch/providers']?.results?.[TMDB_REGION];
                const flatrate = providerData?.flatrate || [];
                if (filterProvider === -1) return flatrate.length === 0;
                return flatrate.some((p: any) => p.provider_id === filterProvider);
            }
            return true;
        });
    }, [enrichedWatchlist, filterProvider]);

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
                    onChange={(val: any) => setFilterProvider(val)}
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
                                onClick={() => setSelectedMedia(media)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {selectedMedia && (
                <WatchlistModal
                    media={selectedMedia}
                    type={selectedMedia.media_type as 'movie' | 'tv'}
                    onClose={() => setSelectedMedia(null)}
                />
            )}
        </div>
    );
};
