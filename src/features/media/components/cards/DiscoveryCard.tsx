import React, { useState } from 'react';
import { Plus, Check, Star } from 'lucide-react';
import { type TMDBMedia } from '../../../../lib/tmdb';
import { useWatchlist } from '../../../watchlist/context/WatchlistContext';
import { MovieModal } from '../../../movies/components/MovieModal';
import { ShowModal } from '../../../shows/components/ShowModal';

interface DiscoveryCardProps {
    media: TMDBMedia;
    isAdded: boolean;
    onAdd: (media: TMDBMedia) => void;
    // onClick is now handled internally to open unified modals
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
    media,
    isAdded,
    onAdd
}) => {
    const { watchlist, removeFromWatchlist } = useWatchlist();
    const [showModal, setShowModal] = useState(false);

    const title = media.title || media.name || 'Unknown';
    const posterUrl = media.poster_path
        ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
        : `https://placehold.co/500x750/1f2937/ffffff?text=${encodeURIComponent(title)}`;

    const year = (media.release_date || media.first_air_date)?.substring(0, 4);
    const isTV = media.media_type === 'tv' || !!media.first_air_date;

    // Ported TV Status logic
    const getTVStatus = () => {
        if (!isTV) return null;
        const watchlistItem = watchlist.find(i => i.tmdb_id === media.id && i.type === 'show');
        if (!watchlistItem) return null;

        const meta = (watchlistItem.metadata || {}) as any;
        const lastWatched = watchlistItem.last_watched_season || 0;

        // Use seasons list from metadata if available
        let totalSeasons = meta.number_of_seasons || 0;
        const seasonsList = meta.seasons || [];

        if (seasonsList.length > 0) {
            const today = new Date();
            const releasedSeasons = seasonsList.filter((s: any) => s.season_number > 0 && s.air_date && new Date(s.air_date) <= today);
            totalSeasons = releasedSeasons.length;
        }

        const remainingSeasons = Math.max(0, totalSeasons - lastWatched);

        let label = '';
        if (watchlistItem.status === 'show_returning') label = 'Upcoming Season';
        else if (watchlistItem.status === 'show_watching') label = 'Ongoing';
        else if (watchlistItem.status === 'show_new') label = 'Premiere';

        return { remainingSeasons, label };
    };

    const tvStatus = getTVStatus();

    return (
        <>
            <div className="discovery-card group" onClick={() => setShowModal(true)}>
                <div className="discovery-poster-wrapper">
                    <img src={posterUrl} alt={title} className="discovery-poster-img" loading="lazy" />

                    {/* Standardized Pills Stack (Top-Left) */}
                    <div className="pill-stack">
                        {media.vote_average > 0 && (
                            <div className="media-pill pill-rating">
                                <Star size={10} fill="#fbbf24" strokeWidth={0} />
                                <span>{media.vote_average.toFixed(1)}</span>
                            </div>
                        )}

                        {year && (
                            <div className="media-pill pill-year">
                                <span>{year}</span>
                            </div>
                        )}

                        {tvStatus && tvStatus.remainingSeasons > 0 && (
                            <div className="media-pill pill-seasons">
                                <span>{tvStatus.remainingSeasons} Season{tvStatus.remainingSeasons > 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>

                    {/* Content Overlay */}
                    <div className="discovery-actions">
                        {isAdded ? (
                            <button
                                className="added-badge"
                                title="Remove from Library"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromWatchlist(media.id, isTV ? 'show' : 'movie');
                                }}
                            >
                                <Check size={14} strokeWidth={3} />
                                <span>Added</span>
                            </button>
                        ) : (
                            <button
                                className="discovery-add-btn"
                                title="Add to Library"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAdd(media);
                                }}
                            >
                                <Plus size={20} />
                            </button>
                        )}
                    </div>

                    {/* Bottom Info Stack: Label + Title */}
                    <div className="discovery-info-stack">
                        <h4 className="discovery-title line-clamp-2">{title}</h4>
                    </div>
                </div>
            </div>

            {showModal && (
                isTV ? (
                    <ShowModal media={media} onClose={() => setShowModal(false)} />
                ) : (
                    <MovieModal media={media} onClose={() => setShowModal(false)} />
                )
            )}
        </>
    );
};
