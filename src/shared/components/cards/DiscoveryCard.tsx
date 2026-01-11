import React from 'react';
import { Plus, Check, Star } from 'lucide-react';
import { type TMDBMedia } from '../../../lib/tmdb';
import { useWatchlist } from '../../../features/watchlist/context/WatchlistContext';
import { MovieModal } from '../../../features/movies/components/MovieModal';
import { ShowModal } from '../../../features/shows/components/ShowModal';
import { getPosterUrl, getMediaTitle, getMediaYear, isTVShow, formatRating } from '../../../utils';
import { useModal } from '../../../hooks/useModal';

interface DiscoveryCardProps {
    media: TMDBMedia;
    isAdded: boolean;
    onAdd: (media: TMDBMedia) => void;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
    media,
    isAdded,
    onAdd
}) => {
    const { watchlist, removeFromWatchlist } = useWatchlist();
    const { isOpen: showModal, open: openModal, close: closeModal } = useModal();

    const title = getMediaTitle(media);
    const posterUrl = getPosterUrl(media.poster_path, title);
    const year = getMediaYear(media);
    const isTV = isTVShow(media);

    const getTVStatus = () => {
        if (!isTV) return null;
        const watchlistItem = watchlist.find(i => i.tmdb_id === media.id && i.type === 'show');
        if (!watchlistItem) return null;

        const meta = (watchlistItem.metadata || {}) as TMDBMedia;
        const lastWatched = watchlistItem.last_watched_season || 0;

        let totalSeasons = meta.number_of_seasons || 0;
        const seasonsList = meta.seasons || [];

        if (seasonsList.length > 0) {
            const today = new Date();
            const releasedSeasons = seasonsList.filter((s) => s.season_number > 0 && s.air_date && new Date(s.air_date) <= today);
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
            <div className="discovery-card group" onClick={() => openModal()}>
                <div className="discovery-poster-wrapper">
                    <img src={posterUrl} alt={title} className="discovery-poster-img" loading="lazy" />

                    <div className="pill-stack">
                        {media.vote_average > 0 && (
                            <div className="media-pill pill-rating">
                                <Star size={10} fill="#fbbf24" strokeWidth={0} />
                                <span>{formatRating(media.vote_average)}</span>
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

                    <div className="discovery-info-stack">
                        <h4 className="discovery-title line-clamp-2">{title}</h4>
                    </div>
                </div>
            </div>

            {showModal && (
                isTV ? (
                    <ShowModal media={media} onClose={closeModal} />
                ) : (
                    <MovieModal media={media} onClose={closeModal} />
                )
            )}
        </>
    );
};
