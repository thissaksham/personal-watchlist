import { X, Check, Calendar, ArrowUp } from 'lucide-react';
import { type TMDBMedia } from '../../lib/tmdb';
import { useWatchlist } from '../../context/WatchlistContext';

interface UpcomingCardProps {
    media: TMDBMedia;
    onRemove: (media: TMDBMedia) => void;
    onMarkWatched: (media: TMDBMedia) => void;
    onSetDate: (media: TMDBMedia) => void;
    onMoveToLibrary: (media: TMDBMedia) => void;
    showDateOverride?: boolean;
    onClick: (media: TMDBMedia) => void;
}

export const UpcomingCard = ({
    media,
    onRemove,
    onMarkWatched,
    onSetDate,
    onMoveToLibrary,
    showDateOverride,
    onClick,
}: UpcomingCardProps) => {
    const { watchedSeasons } = useWatchlist();
    const title = media.title || media.name || 'Unknown';
    const imageUrl = media.poster_path
        ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
        : `https://placehold.co/500x750/1f2937/ffffff?text=${encodeURIComponent(title)}`;

    // Logic to calculate remaining stats (Shared logic - could be extracted but keeping inline for safely)
    const getStats = () => {
        // media.media_type might not be reliable if not explicitly passed, 
        // but typically 'number_of_seasons' presence is a good indicator of TV or type check
        const isTV = media.media_type === 'tv' || media.number_of_seasons || (media as any).tmdbMediaType === 'tv' || (media as any).tmdbMediaType === 'show';
        if (!isTV) return null;

        // Use seasons array for accurate "Released" count if available
        let totalSeasons = media.number_of_seasons || 0;
        let totalEpisodes = media.number_of_episodes || 0;
        let seasonsList = media.seasons;

        // If we have detailed seasons, filter out future ones
        if (seasonsList && Array.isArray(seasonsList)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const releasedSeasons = seasonsList.filter((s: any) => {
                if (s.season_number === 0) return false;
                if (!s.air_date) return false; // Assume unreleased if no date
                return new Date(s.air_date) <= today;
            });

            totalSeasons = releasedSeasons.length;
            totalEpisodes = releasedSeasons.reduce((acc: number, s: any) => acc + (s.episode_count || 0), 0);
            seasonsList = releasedSeasons;
        }

        if (!totalSeasons && !media.number_of_seasons) return null;

        let watchedCount = 0;
        // Count how many *Released* seasons are watched.
        if (seasonsList && Array.isArray(seasonsList)) {
            watchedCount = seasonsList.filter((s: any) => watchedSeasons.has(`${media.id}-${s.season_number}`)).length;
        } else {
            for (let i = 1; i <= totalSeasons; i++) {
                if (watchedSeasons.has(`${media.id}-${i}`)) {
                    watchedCount++;
                }
            }
        }

        const remainingSeasons = Math.max(0, totalSeasons - watchedCount);

        let remainingEpisodes = totalEpisodes;
        if (seasonsList && Array.isArray(seasonsList)) {
            const watchedSeasonNums = new Set();
            seasonsList.forEach((s: any) => {
                if (watchedSeasons.has(`${media.id}-${s.season_number}`)) {
                    watchedSeasonNums.add(s.season_number);
                }
            });

            remainingEpisodes = seasonsList.reduce((acc: number, season: any) => {
                if (!watchedSeasonNums.has(season.season_number)) {
                    // Cap episodes to what has actually aired
                    let count = season.episode_count || 0;

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
        } else {
            if (totalSeasons > 0) {
                const avgEps = totalEpisodes / totalSeasons;
                remainingEpisodes = Math.round(remainingEpisodes - (watchedCount * avgEps));
            }
        }

        remainingEpisodes = Math.max(0, remainingEpisodes);

        return { remainingSeasons, remainingEpisodes };
    };

    const stats = getStats();

    const getDuration = () => {
        let avgRuntime = 0;
        if (media.tvmaze_runtime) avgRuntime = media.tvmaze_runtime;
        else if (media.episode_run_time && media.episode_run_time.length > 0) avgRuntime = Math.min(...media.episode_run_time);
        else if (media.last_episode_to_air?.runtime) avgRuntime = media.last_episode_to_air.runtime;
        else if (media.runtime) avgRuntime = media.runtime;

        if (!avgRuntime) return null;

        // If stats exist (TV), calc remaining
        if (stats) {
            const totalMinutes = stats.remainingEpisodes * avgRuntime;
            if (totalMinutes >= 24 * 60) {
                const days = Math.floor(totalMinutes / (24 * 60));
                const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
                return `${days}d ${hours}h`;
            }
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            if (h > 0) return `${h}h ${m}m`;
            return `${m}m`;
        }
        return null;
    };
    const duration = getDuration();


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

                {/* Stats Pills for Upcoming (New) */}
                {(stats && stats.remainingSeasons > 0) && (
                    <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                        <div className="media-pill pill-seasons"><span>{stats.remainingSeasons}S {stats.remainingEpisodes}E</span></div>
                        {duration && (
                            <div className="media-pill pill-duration"><span>{duration}</span></div>
                        )}
                    </div>
                )}


                {/* Actions Stack */}
                <div className="card-actions-stack">
                    {/* Manual Date Override (Only for Released Movies in Coming Soon) */}
                    {showDateOverride &&
                        (media.media_type === 'movie' || (media as any).tmdbMediaType === 'movie') &&
                        (media as any).seasonInfo === 'Released' && (
                            <button
                                className="add-btn bg-white/10 hover:bg-white/20 text-white"
                                onClick={(e) => { e.stopPropagation(); onSetDate(media); }}
                                title="Set Release Date"
                            >
                                <Calendar size={16} />
                            </button>
                        )}
                    {/* Move to Library Button (Only when released) */}
                    {media.countdown !== undefined && media.countdown <= 0 && (
                        <button
                            className="add-btn bg-teal-500 text-black shadow-[0_0_10px_rgba(45,212,191,0.5)] border-teal-500 animate-pulse-slow"
                            onClick={(e) => { e.stopPropagation(); onMoveToLibrary(media); }}
                            title="Move to Library"
                        >
                            <ArrowUp size={16} strokeWidth={3} />
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
                        title="Hide from Upcoming"
                        style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="card-info">
                <h3 className="text-sm font-semibold truncate text-gray-100">{title}</h3>
                {/* {!media.first_air_date && <p className="text-xs text-gray-400">{releaseDate}</p>} */}
            </div>
        </div>
    );
};
