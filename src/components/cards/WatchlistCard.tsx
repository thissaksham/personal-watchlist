
import { Star, Check, X } from 'lucide-react';
import { type TMDBMedia, calculateMediaRuntime } from '../../lib/tmdb';

interface WatchlistCardProps {
    media: TMDBMedia;
    type?: 'movie' | 'tv';
    onRemove: (media: TMDBMedia) => void;
    onMarkWatched: (media: TMDBMedia) => void;
    onClick: (media: TMDBMedia) => void;
}

export const WatchlistCard = ({
    media,
    type,
    onRemove,
    onMarkWatched,
    onClick
}: WatchlistCardProps) => {
    const title = media.title || media.name || 'Unknown';
    const imageUrl = media.poster_path
        ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
        : `https://placehold.co/500x750/1f2937/ffffff?text=${encodeURIComponent(title)}`;

    const year = (media.release_date || media.first_air_date)?.split('-')[0] || '';

    // Format Duration
    const getDuration = () => {
        const totalMinutes = calculateMediaRuntime(media);
        if (!totalMinutes) return null;

        if (totalMinutes >= 24 * 60) {
            const days = Math.floor(totalMinutes / (24 * 60));
            const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
            return `${days}d ${hours}h`;
        }

        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };
    const duration = getDuration();

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
                {(type === 'tv' && media.number_of_seasons) && (
                    <div className="media-pill pill-seasons"><span>{media.number_of_seasons}S {media.number_of_episodes}E</span></div>
                )}
                {duration && (
                    <div className="media-pill pill-duration"><span>{duration}</span></div>
                )}

                {/* Actions Stack */}
                <div className="card-actions-stack">
                    <button
                        className="add-btn bg-white/10 hover:bg-teal-500/80 text-white"
                        onClick={(e) => { e.stopPropagation(); onMarkWatched(media); }}
                        title="Mark as Watched"
                    >
                        <Check size={16} />
                    </button>
                    <button
                        className="add-btn text-white hover:scale-110"
                        onClick={(e) => { e.stopPropagation(); onRemove(media); }}
                        title="Remove from Library"
                        style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="card-info">
                <h3 className="text-sm font-semibold truncate text-gray-100">{title}</h3>
            </div>
        </div>
    );
};
