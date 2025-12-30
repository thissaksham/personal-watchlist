import { useEffect } from 'react';
import { DiscoveryCard } from '../features/media/components/cards/DiscoveryCard';
import { useWatchlist } from '../features/watchlist/context/WatchlistContext';
import { Flame } from 'lucide-react';
import { useTrending } from '../features/media/hooks/useTMDB';
import type { TMDBMedia } from '../lib/tmdb';

export const Trending = () => {
    const { data, isLoading, error } = useTrending('all', 'week');
    const { addToWatchlist, isInWatchlist } = useWatchlist();

    const trending = (data?.results as TMDBMedia[]) || [];

    // Effect for title only
    useEffect(() => {
        document.title = 'CineTrack | Trending';
    }, []);

    const handleAdd = async (media: TMDBMedia) => {
        const type = media.media_type === 'tv' ? 'show' : 'movie';
        await addToWatchlist(media, type);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title flex items-center gap-2">
                        <Flame className="text-orange-500" size={32} />
                        Trending Now
                    </h1>
                    <p className="subtitle">See what's popular across Movies and TV.</p>
                </div>

                {/* Filters Removed */}
            </div>

            {isLoading ? (
                <div className="media-grid">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="media-card" style={{ height: '300px', backgroundColor: '#2a2a2a' }} />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <p className="text-red-400 text-lg mb-2">Error loading content</p>
                    <p className="text-gray-400">{(error as Error).message || "Failed to load trending content."}</p>
                </div>
            ) : trending.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-400">No trending content found.</p>
                </div>
            ) : (
                <div className="media-grid">
                    {trending.map((media) => (
                        <div key={`${media.media_type}-${media.id}`}>
                            <DiscoveryCard
                                media={media}
                                isAdded={isInWatchlist(media.id, media.media_type === 'tv' ? 'show' : 'movie')}
                                onAdd={() => handleAdd(media)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
