
import { Star, Check, X, Plus, Undo2 } from 'lucide-react';
import { type TMDBMedia, calculateMediaRuntime } from '../lib/tmdb';

interface MediaCardProps {
    media: TMDBMedia;
    type?: 'movie' | 'tv';
    onAdd?: (media: TMDBMedia) => void;
    onRemove?: (media: TMDBMedia) => void;
    onUnwatch?: (media: TMDBMedia) => void;
    onMarkWatched?: (media: TMDBMedia) => void; // New Action
    isWatched?: boolean;
    // Config for Pills
    showRating?: boolean;
    showYear?: boolean;
    showDuration?: boolean;
    showSeasons?: boolean; // For "1S10E"
}

export const MediaCard = ({
    media,
    type,
    onAdd,
    onRemove,
    onUnwatch,
    onMarkWatched,
    isWatched = false,
    showRating = true,
    showYear = true,
    showDuration = true,
    showSeasons = true
}: MediaCardProps) => {
    const title = media.title || media.name || 'Unknown';
    const imageUrl = media.poster_path
        ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
        : `https://placehold.co/500x750/1f2937/ffffff?text=${encodeURIComponent(title)}`;

    // Format Data
    const year = (media.release_date || media.first_air_date)?.split('-')[0] || '';

    // Format Duration
    const getDuration = () => {
        const totalMinutes = calculateMediaRuntime(media);
        if (!totalMinutes) return null;

        // If it's a TV show (long content), fallback to Days/Hours format if > 24h
        if (totalMinutes >= 24 * 60) {
            const days = Math.floor(totalMinutes / (24 * 60));
            const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
            return `${days}d ${hours}h`;
        }

        // Standard H/M format for Movies or short series
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;

        // Don't show "0h 45m", just "45m"
        // Don't show "2h 0m", just "2h 0m" (actually standard is usually 2h 0m or 2h)
        // Let's match previous behavior:
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };
    const duration = getDuration();

    return (
        <div className="media-card group">
            {/* Poster Image Wrapper with Overlays */}
            <div className="poster-wrapper">
                <img
                    src={imageUrl}
                    alt={title}
                    className="poster-img"
                    loading="lazy"
                />

                {/* Overlay Pills */}
                {/* 1. Rating Pill */}
                {showRating && media.vote_average > 0 && (
                    <div className="media-pill pill-rating">
                        <Star size={10} fill="#fbbf24" strokeWidth={0} />
                        <span>{media.vote_average.toFixed(1)}</span>
                    </div>
                )}

                {/* 2. Year Pill */}
                {showYear && year && (
                    <div className="media-pill pill-year">
                        <span>{year}</span>
                    </div>
                )}

                {/* 3. Season/Episode Count Pill (TV Only) */}
                {showSeasons && (type === 'tv' && media.number_of_seasons) && (
                    <div className="media-pill pill-seasons">
                        <span>{media.number_of_seasons}S {media.number_of_episodes}E</span>
                    </div>
                )}

                {/* 4. Duration Pill */}
                {showDuration && duration && (
                    <div className="media-pill pill-duration">
                        <span>{duration}</span>
                    </div>
                )}

                {/* ACTIONS */}



                {/* Action Area (Top Right) */}
                <div className="card-actions-stack">

                    {/* Add Button */}
                    {onAdd && !onRemove && !isWatched && (
                        <button
                            className="add-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAdd(media);
                            }}
                            title="Add to Watchlist"
                        >
                            <Plus size={16} />
                        </button>
                    )}

                    {/* Unwatch Button */}
                    {onUnwatch && (
                        <button
                            className="add-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onUnwatch(media);
                            }}
                            title="Unwatch"
                        >
                            <Undo2 size={16} />
                        </button>
                    )}

                    {/* Mark as Watched Button (New) */}
                    {onMarkWatched && (
                        <button
                            className="add-btn bg-white/10 hover:bg-teal-500/80 text-white"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkWatched(media);
                            }}
                            title="Mark as Watched"
                        >
                            <Check size={16} />
                        </button>
                    )}


                    {/* Remove Button (Moved to stack) */}
                    {onRemove && (
                        <button
                            className="add-btn text-white hover:scale-110"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(media);
                            }}
                            title="Remove from Library"
                            style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                        >
                            <X size={16} />
                        </button>
                    )}
                    {/* Watched Indicator (Moved to stack for consistency) */}
                    {isWatched && !onUnwatch && !onRemove && !onMarkWatched && (
                        <div className="add-btn cursor-default bg-teal-500/80 border-teal-500" title="In Watchlist">
                            <Check size={16} />
                        </div>
                    )}
                </div>
            </div>

            <div className="card-info">
                <h3 className="text-sm font-semibold truncate text-gray-100">{title}</h3>
            </div>
        </div >
    );
};
