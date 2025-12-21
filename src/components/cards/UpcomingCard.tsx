
import { Plus, Check } from 'lucide-react';
import { type TMDBMedia } from '../../lib/tmdb';

interface UpcomingCardProps {
    media: TMDBMedia;
    type?: 'movie' | 'tv';
    onToggleReminder: (media: TMDBMedia) => void;
    onClick: (media: TMDBMedia) => void;
    isRemindSet?: boolean;
}

export const UpcomingCard = ({
    media,
    type,
    onToggleReminder,
    onClick,
    isRemindSet = false
}: UpcomingCardProps) => {
    const title = media.title || media.name || 'Unknown';
    const imageUrl = media.poster_path
        ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
        : `https://placehold.co/500x750/1f2937/ffffff?text=${encodeURIComponent(title)}`;

    const releaseDate = media.release_date || media.first_air_date;
    const year = releaseDate?.split('-')[0] || '';

    return (
        <div className="media-card group" onClick={() => onClick(media)}>
            <div className="poster-wrapper">
                <img src={imageUrl} alt={title} className="poster-img" loading="lazy" />

                {/* Countdown Pill */}
                {media.countdown && (
                    <div className="absolute top-2 right-2 z-10 bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg border border-teal-500/50 shadow-lg flex flex-col items-center min-w-[50px]">
                        <span className="text-xl font-bold text-teal-400 leading-none">{media.countdown}</span>
                        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Days</span>
                    </div>
                )}

                {/* Actions Stack */}
                <div className="card-actions-stack">
                    <button
                        className={`add-btn ${isRemindSet ? 'bg-teal-500/80 border-teal-500' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onToggleReminder(media); }}
                        title={isRemindSet ? "Reminder Set (Click to Remove)" : "Remind Me"}
                    >
                        {isRemindSet ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                </div>
            </div>

            <div className="card-info">
                <h3 className="text-sm font-semibold truncate text-gray-100">{title}</h3>
                <p className="text-xs text-gray-400">{releaseDate}</p>
            </div>
        </div>
    );
};
