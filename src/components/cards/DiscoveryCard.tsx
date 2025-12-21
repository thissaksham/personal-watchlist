
import { Star, Plus, Check } from 'lucide-react';
import { type TMDBMedia } from '../../lib/tmdb';

interface DiscoveryCardProps {
    media: TMDBMedia;
    onAdd: (media: TMDBMedia) => void;
    onClick: (media: TMDBMedia) => void;
    isInWatchlist?: boolean;
}

export const DiscoveryCard = ({
    media,
    onAdd,
    onClick,
    isInWatchlist = false
}: DiscoveryCardProps) => {
    const title = media.title || media.name || 'Unknown';
    const imageUrl = media.poster_path
        ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
        : `https://placehold.co/500x750/1f2937/ffffff?text=${encodeURIComponent(title)}`;

    const year = (media.release_date || media.first_air_date)?.split('-')[0] || '';

    return (
        <div className="media-card group" onClick={() => onClick(media)}>
            <div className="poster-wrapper">
                <img src={imageUrl} alt={title} className="poster-img" loading="lazy" />

                {/* Overlays */}
                {media.vote_average > 0 && (
                    <div className="media-pill pill-rating">
                        <Star size={10} fill="#fbbf24" strokeWidth={0} />
                        <span>{media.vote_average.toFixed(1)}</span>
                    </div>
                )}
                {year && (
                    <div className="media-pill pill-year"><span>{year}</span></div>
                )}

                {/* Actions Stack */}
                <div className="card-actions-stack">
                    {!isInWatchlist ? (
                        <button
                            className="add-btn"
                            onClick={(e) => { e.stopPropagation(); onAdd(media); }}
                            title="Add to Watchlist"
                        >
                            <Plus size={16} />
                        </button>
                    ) : (
                        <div className="add-btn cursor-default bg-teal-500/80 border-teal-500" title="In Watchlist">
                            <Check size={16} />
                        </div>
                    )}
                </div>
            </div>

            <div className="card-info">
                <h3 className="text-sm font-semibold truncate text-gray-100">{title}</h3>
            </div>
        </div>
    );
};
