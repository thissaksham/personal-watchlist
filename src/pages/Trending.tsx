import { useEffect, useState } from 'react';
import { tmdb, type TMDBMedia } from '../lib/tmdb';
import { DiscoveryCard } from '../components/cards/DiscoveryCard';
import { DiscoveryModal } from '../components/modals/DiscoveryModal';
import { useWatchlist } from '../context/WatchlistContext';
import { Flame } from 'lucide-react';

export const Trending = () => {
    const [trending, setTrending] = useState<TMDBMedia[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMedia, setSelectedMedia] = useState<TMDBMedia | null>(null);
    const { addToWatchlist, isInWatchlist } = useWatchlist();

    // Filters
    // Removed activeTab and timeWindow

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTrending = async () => {
            // Quick check for API key
            if (!import.meta.env.VITE_TMDB_API_KEY) {
                setError("Missing API Key. Please add VITE_TMDB_API_KEY to your .env file.");
                setLoading(false);
                return;
            }

            setLoading(true); // Reset loading on filter change
            try {
                // Fetch trending based on active tab
                // Note: getTrending(type, time)
                const data = await tmdb.getTrending('all', 'week');
                setTrending(data.results || []);
            } catch (err: any) {
                console.error("Failed to fetch trending", err);
                setError(err.message || "Failed to load trending content.");
            } finally {
                setLoading(false);
            }
        };
        fetchTrending();
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

            {loading ? (
                <div className="media-grid">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="media-card" style={{ height: '300px', backgroundColor: '#2a2a2a' }} />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12">
                    <p className="text-red-400 text-lg mb-2">Error loading content</p>
                    <p className="text-gray-400">{error}</p>
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
                                type={media.media_type as 'movie' | 'tv'}
                                onAdd={() => handleAdd(media)}
                                onClick={() => setSelectedMedia(media)}
                                isInWatchlist={isInWatchlist(media.id, media.media_type === 'tv' ? 'show' : 'movie')}
                            />
                        </div>
                    ))}
                </div>
            )}

            {selectedMedia && (
                <DiscoveryModal
                    media={selectedMedia}
                    type={selectedMedia.media_type as 'movie' | 'tv'}
                    onClose={() => setSelectedMedia(null)}
                />
            )}
        </div>
    );
};
