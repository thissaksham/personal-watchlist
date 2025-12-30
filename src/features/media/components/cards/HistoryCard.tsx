
import { Star, Undo2, X, CalendarPlus } from 'lucide-react';
import { type TMDBMedia } from '../../../../lib/tmdb';

interface HistoryCardProps {
    media: TMDBMedia;
    onUnwatch: (media: TMDBMedia) => void;
    onRemove: (media: TMDBMedia) => void;
    onRestoreToUpcoming?: (media: TMDBMedia) => void;
    onClick: (media: TMDBMedia) => void;
}

export const HistoryCard = ({
    media,
    onUnwatch,
    onRemove,
    onRestoreToUpcoming,
    onClick
}: HistoryCardProps) => {
    const title = media.title || media.name || 'Unknown';
    const imageUrl = media.poster_path
        ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
        : `https://placehold.co/500x750/1f2937/ffffff?text=${encodeURIComponent(title)}`;

    const year = (media.release_date || media.first_air_date)?.split('-')[0] || '';

    return (
        <div className="media-card group" onClick={() => onClick(media)}>
            <div className="poster-wrapper">
                <img src={imageUrl} alt={title} className="poster-img" style={{ filter: 'grayscale(100%)' }} loading="lazy" />

                {/* Top-Left Pills Container */}
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
                </div>

                {/* Actions Stack */}
                <div className="card-actions-stack">
                    {/* Restore to Upcoming Button */}
                    {((media as any).dismissed_from_upcoming && onRestoreToUpcoming) && (
                        <button
                            className="add-btn bg-white/10 hover:bg-blue-500/80 text-white"
                            onClick={(e) => { e.stopPropagation(); onRestoreToUpcoming(media); }}
                            title="Start Tracking Upcoming Seasons"
                        >
                            <CalendarPlus size={16} />
                        </button>
                    )}
                    <button
                        className="add-btn"
                        onClick={(e) => { e.stopPropagation(); onUnwatch(media); }}
                        title="Unwatch (Move to Watchlist)"
                    >
                        <Undo2 size={16} />
                    </button>
                    <button
                        className="add-btn text-white hover:scale-110"
                        onClick={(e) => { e.stopPropagation(); onRemove(media); }}
                        title="Remove from History"
                        style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Bottom Info Stack: Title */}
                <div className="discovery-info-stack">
                    <h4 className="discovery-title line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{title}</h4>
                </div>
            </div>
        </div>
    );
};
