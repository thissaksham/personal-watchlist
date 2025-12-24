import { X, Check, Calendar, ArrowUp, Pencil } from 'lucide-react';
import { type TMDBMedia, TMDB_REGION } from '../../lib/tmdb';
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
    const { watchlist } = useWatchlist();
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

        const watchlistItem = watchlist.find(i => i.tmdb_id === media.id && i.type === 'show');
        const lastWatched = watchlistItem?.last_watched_season || 0;

        const watchedCount = lastWatched;
        const remainingSeasons = Math.max(0, totalSeasons - watchedCount);

        let remainingEpisodes = totalEpisodes;
        if (seasonsList && Array.isArray(seasonsList)) {
            remainingEpisodes = seasonsList.reduce((acc: number, season: any) => {
                if (season.season_number > 0 && season.season_number > lastWatched) {
                    // Cap episodes to what has actually aired
                    let count = season.episode_count || 0;

                    if (media.next_episode_to_air) {
                        const nextSeason = media.next_episode_to_air.season_number;
                        const nextEpNum = media.next_episode_to_air.episode_number;

                        if (season.season_number === nextSeason) {
                            // If we are in the season that is currently airing (next ep exists),
                            // then the valid "released" count is just before the next one.
                            count = Math.max(0, nextEpNum - 1);
                        } else if (season.season_number > nextSeason) {
                            count = 0; // Future season
                        }
                    } else if (media.last_episode_to_air) {
                        // Fallback to last_episode_to_air if next_episode_to_air is null (e.g. season finished)
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
            if (totalMinutes <= 0) return null; // Hide if 0

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


                {/* Stats Pills for Upcoming (New) */}
                {(() => {
                    const isTV = media.media_type === 'tv' || media.number_of_seasons || (media as any).tmdbMediaType === 'tv' || (media as any).tmdbMediaType === 'show';
                    const status = (media as any).status;
                    const isMovieOTT = status === 'movie_on_ott' || (media as any).tabCategory === 'ott';
                    const isMovieComingSoon = status === 'movie_coming_soon' || (media as any).tabCategory === 'coming_soon';

                    let providerName = '';
                    let formattedDate = '';
                    let label = '';
                    let labelColor = '';
                    let contextLabel = '';

                    const formatDisplayDate = (d: string | undefined | null) => {
                        if (!d) return '';
                        if (d.length === 4) return d;
                        const date = new Date(d);
                        const year = date.getFullYear();
                        const currentYear = new Date().getFullYear();
                        if (year > currentYear) {
                            return `${date.getDate()} ${date.toLocaleString(undefined, { month: 'short' })} '${year.toString().slice(-2)}`;
                        }
                        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    };

                    // 1. Unified Logic for TV Shows
                    if (isTV) {
                        const nextEp = media.next_episode_to_air;
                        let nextEpDate = nextEp?.air_date;
                        let seasonNumber = nextEp?.season_number;
                        let episodeNumber = nextEp?.episode_number;

                        if (!nextEpDate && media.seasons && Array.isArray(media.seasons)) {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const futureSeason = media.seasons.find((s: any) => s.air_date && new Date(s.air_date) >= today);
                            if (futureSeason) {
                                nextEpDate = futureSeason.air_date;
                                seasonNumber = futureSeason.season_number;
                                episodeNumber = 1;
                            }
                        }

                        const dateStr = nextEpDate || media.first_air_date || media.release_date;
                        formattedDate = formatDisplayDate(dateStr);

                        if (isMovieOTT) {
                            const providers = media['watch/providers']?.results?.[TMDB_REGION];
                            providerName = providers?.flatrate?.[0]?.provider_name ||
                                providers?.ads?.[0]?.provider_name ||
                                providers?.free?.[0]?.provider_name || 'OTT';
                        }

                        // Granular Context Label Logic
                        const isEnded = media.status === 'Ended' || media.status === 'Canceled';
                        const lastSeasonNumber = media.number_of_seasons || 0;
                        const currentSeason = media.seasons?.find((s: any) => s.season_number === seasonNumber);
                        const isLastEpisodeOfSeason = currentSeason && episodeNumber && episodeNumber === currentSeason.episode_count;
                        const isLastSeason = seasonNumber && seasonNumber === lastSeasonNumber;

                        if (seasonNumber === 1 && episodeNumber === 1) {
                            contextLabel = 'New Show';
                        } else if (isLastSeason && isEnded) {
                            if (episodeNumber === 1) contextLabel = 'Final Season';
                            else if (isLastEpisodeOfSeason) contextLabel = 'Final Episode';
                            else contextLabel = 'Next Episode';
                        } else if (episodeNumber === 1) {
                            contextLabel = 'New Season';
                        } else if (isLastEpisodeOfSeason) {
                            contextLabel = 'Last Episode';
                        } else {
                            contextLabel = 'Next Episode';
                        }
                    }

                    // 2. Custom Logic for Movie OTT
                    else if (isMovieOTT) {
                        const dateStr = (media as any).manual_date_override || media.release_date;
                        formattedDate = formatDisplayDate(dateStr);

                        const providers = media['watch/providers']?.results?.[TMDB_REGION];
                        providerName = providers?.flatrate?.[0]?.provider_name ||
                            providers?.ads?.[0]?.provider_name ||
                            providers?.free?.[0]?.provider_name || 'OTT';
                        contextLabel = 'New Movie';
                    }

                    // 3. Custom Logic for Movie Coming Soon
                    else if (isMovieComingSoon) {
                        const dateStr = (media as any).manual_date_override || media.release_date;
                        formattedDate = formatDisplayDate(dateStr);

                        const isInTheatres = dateStr && new Date(dateStr) <= new Date();
                        label = isInTheatres ? 'In Theatres' : 'Coming Soon';
                        labelColor = isInTheatres ? 'text-amber-400 border-amber-500/30' : 'text-blue-400 border-blue-500/30';
                        contextLabel = 'New Movie';
                    }

                    if (!isTV && !isMovieOTT && !isMovieComingSoon) return null;

                    return (
                        <>
                            <div className="pill-stack">
                                {providerName && (
                                    <div className="media-pill" style={{ backgroundColor: 'rgba(20, 20, 20, 0.8)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                                        <span className="text-gray-300">{providerName}</span>
                                    </div>
                                )}
                                {formattedDate && (
                                    <div className="media-pill font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ backgroundColor: 'rgba(20, 20, 20, 0.9)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                                        {formattedDate}
                                    </div>
                                )}
                                {isTV && ((stats && stats.remainingSeasons > 0) || !stats) && (
                                    <div className="media-pill pill-seasons">
                                        <span>{stats && stats.remainingSeasons > 0 ? (stats.remainingSeasons > 1 ? `${stats.remainingSeasons}S ` : '') + `${stats.remainingEpisodes}E` :
                                            (media.number_of_seasons ? `${media.number_of_seasons} Seasons` : 'New Series')}</span>
                                    </div>
                                )}
                                {isTV && duration && (
                                    <div className="media-pill pill-duration"><span>{duration}</span></div>
                                )}
                                {label && (
                                    <div className={`media-pill ${labelColor}`} style={{ backgroundColor: 'rgba(20, 20, 20, 0.8)' }}>
                                        <span>{label}</span>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Info Stack: Label + Title */}
                            <div className="discovery-info-stack">
                                {contextLabel && (
                                    <div className="media-pill" style={{ backgroundColor: 'rgba(20, 20, 20, 0.8)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                                        <span className="text-gray-300">{contextLabel}</span>
                                    </div>
                                )}
                                <h4 className="discovery-title line-clamp-2">{title}</h4>
                            </div>
                        </>
                    );
                })()}


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
                    {/* Mark as Watched (Hide for future show_new) */}
                    {(!((media as any).status === 'show_new' && media.countdown !== undefined && media.countdown > 0)) && (
                        <button
                            className="add-btn bg-white/10 hover:bg-teal-500/80 text-white"
                            onClick={(e) => { e.stopPropagation(); onMarkWatched(media); }}
                            title="Mark as Watched"
                        >
                            <Check size={16} />
                        </button>
                    )}
                    <button
                        className="add-btn text-white hover:scale-110"
                        onClick={(e) => { e.stopPropagation(); onRemove(media); }}
                        title="Remove from Upcoming"
                        style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Edit Date Pencil (Bottom Right) */}
                {((media as any).status === 'movie_on_ott' || (media as any).tabCategory === 'ott') && (media as any).manual_date_override && (
                    <button
                        className="edit-date-btn"
                        onClick={(e) => { e.stopPropagation(); onSetDate(media); }}
                        title="Edit Release Date"
                    >
                        <Pencil size={14} strokeWidth={3} />
                    </button>
                )}
            </div>
        </div>
    );
};
