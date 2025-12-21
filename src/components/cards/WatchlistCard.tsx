import { Star, Check, X, Undo2 } from 'lucide-react';
import { type TMDBMedia } from '../../lib/tmdb';
import { useWatchlist } from '../../context/WatchlistContext';

interface WatchlistCardProps {
    media: TMDBMedia;
    type?: 'movie' | 'tv';
    onRemove: (media: TMDBMedia) => void;
    onMarkWatched: (media: TMDBMedia) => void;
    onMarkUnwatched?: (media: TMDBMedia) => void;
    onClick: (media: TMDBMedia) => void;
}

export const WatchlistCard = ({
    media,
    type,
    onRemove,
    onMarkWatched,
    onMarkUnwatched,
    onClick
}: WatchlistCardProps) => {
    const { watchedSeasons } = useWatchlist();

    const title = media.title || media.name || 'Unknown';
    const imageUrl = media.poster_path
        ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
        : `https://placehold.co/500x750/1f2937/ffffff?text=${encodeURIComponent(title)}`;

    const year = (media.release_date || media.first_air_date)?.split('-')[0] || '';

    // Calculate Remaining Stats
    const getStats = () => {
        if (type !== 'tv') return null;

        let totalSeasons = media.number_of_seasons || 0;
        const totalEpisodes = media.number_of_episodes || 0;

        // If we have detailed seasons, filter out future ones FIRST
        if (media.seasons && Array.isArray(media.seasons)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const releasedSeasons = media.seasons.filter((s: any) => {
                if (s.season_number === 0) return false;
                if (!s.air_date) return false; // Assume unreleased if no date
                return new Date(s.air_date) <= today;
            });

            // Update totalSeasons to only reflect RELEASED seasons
            if (releasedSeasons.length > 0) {
                totalSeasons = releasedSeasons.length;
            }
        }

        if (!totalSeasons) return null;

        let watchedCount = 0;
        for (let i = 1; i <= totalSeasons; i++) {
            if (watchedSeasons.has(`${media.id}-${i}`)) {
                watchedCount++;
            }
        }

        const remainingSeasons = Math.max(0, totalSeasons - watchedCount);

        // Estimate remaining episodes
        let remainingEpisodes = totalEpisodes;

        // If we have seasons data in metadata, use it for exact count
        if (media.seasons && Array.isArray(media.seasons)) {
            const watchedSeasonNums = new Set();
            for (let i = 1; i <= totalSeasons; i++) {
                if (watchedSeasons.has(`${media.id}-${i}`)) {
                    watchedSeasonNums.add(i);
                }
            }

            // Calculate sum of episodes for UNWATCHED seasons
            const remainingEpsCount = media.seasons.reduce((acc: number, season: any) => {
                // Skip specials (0) and watched seasons
                if (season.season_number > 0 && !watchedSeasonNums.has(season.season_number)) {
                    // Cap episodes to what has actually aired
                    let count = season.episode_count || 0;

                    // Logic to check if season is future is partly handled by totalSeasons filter above, 
                    // but we ensure simple safety check.
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (season.air_date && new Date(season.air_date) > today) {
                        return acc;
                    }

                    if (media.last_episode_to_air) {
                        const lastSeason = media.last_episode_to_air.season_number;
                        const lastEp = media.last_episode_to_air.episode_number;

                        if (season.season_number > lastSeason) {
                            count = 0; // Future season entirely
                        } else if (season.season_number === lastSeason) {
                            count = lastEp; // Cap to aired episodes
                        }
                    }

                    return acc + count;
                }
                return acc;
            }, 0);

            remainingEpisodes = remainingEpsCount;
        } else {
            // Fallback estimation
            if (totalSeasons > 0) {
                const avgEps = totalEpisodes / totalSeasons;
                remainingEpisodes = Math.round(remainingEpisodes - (watchedCount * avgEps));
            }
        }

        remainingEpisodes = Math.max(0, remainingEpisodes);

        return { remainingSeasons, remainingEpisodes };
    };

    const stats = getStats();

    // Format Duration
    const getDuration = () => {
        let avgRuntime = 0;
        if (media.tvmaze_runtime) avgRuntime = media.tvmaze_runtime;
        else if (media.episode_run_time && media.episode_run_time.length > 0) avgRuntime = Math.min(...media.episode_run_time);
        else if (media.last_episode_to_air?.runtime) avgRuntime = media.last_episode_to_air.runtime;
        else if (media.runtime) avgRuntime = media.runtime;

        if (!avgRuntime) return null;

        // For Movies: Just return formatted avgRuntime
        if (type === 'movie' || !type) {
            const h = Math.floor(avgRuntime / 60);
            const m = avgRuntime % 60;
            if (h > 0) return `${h}h ${m}m`;
            return `${m}m`;
        }

        // For Shows: Calculate REMAINING duration
        if (stats) {
            const totalMinutes = stats.remainingEpisodes * avgRuntime;

            if (totalMinutes >= 24 * 60) {
                const days = Math.floor(totalMinutes / (24 * 60));
                const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
                return `${days}d ${hours}h`;
            }

            if (totalMinutes === 0) return null;

            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            if (h > 0) return `${h}h ${m}m`;
            return `${m}m`;
        }

        // Fallback for shows without stats (shouldn't happen if TV)
        return null;
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

                {/* Modified Season/Episode Pill */}
                {(type === 'tv' && stats && stats.remainingEpisodes > 0) && (
                    <div className="media-pill pill-seasons"><span>{stats.remainingSeasons}S {stats.remainingEpisodes}E</span></div>
                )}

                {duration && (
                    <div className="media-pill pill-duration"><span>{duration}</span></div>
                )}

                {/* Actions Stack */}
                <div className="card-actions-stack">
                    {onMarkUnwatched && (
                        <button
                            className="add-btn bg-white/10 hover:bg-yellow-500/80 text-white"
                            onClick={(e) => { e.stopPropagation(); onMarkUnwatched(media); }}
                            title="Unwatch (Move to Plan to Watch)"
                        >
                            <Undo2 size={16} />
                        </button>
                    )}
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
