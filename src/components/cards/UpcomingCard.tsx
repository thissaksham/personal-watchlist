import { X, Check, Calendar, ArrowUp, Pencil } from 'lucide-react';
import { type TMDBMedia } from '../../lib/tmdb';
import { useWatchlist } from '../../context/WatchlistContext';
import { usePreferences } from '../../context/PreferencesContext';
import { formatDisplayDate, getTodayValues, isReleased, parseDate } from '../../lib/dateUtils';

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
    const { region } = usePreferences();
    const title = media.title || media.name || 'Unknown';
    const imageUrl = media.poster_path
        ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
        : `https://placehold.co/500x750/1f2937/ffffff?text=${encodeURIComponent(title)}`;

    const isTV = media.media_type === 'tv' || media.tmdbMediaType === 'tv' || media.tmdbMediaType === 'show' || !!media.number_of_seasons;

    // Logic to calculate remaining stats
    const getStats = () => {
        if (!isTV) return null;

        let totalSeasons = media.number_of_seasons || 0;
        let totalEpisodes = media.number_of_episodes || 0;
        let seasonsList = media.seasons;

        // Filter out future seasons for "Released" stats
        if (seasonsList && Array.isArray(seasonsList)) {
            const releasedSeasons = seasonsList.filter((s: any) => {
                if (s.season_number === 0) return false;
                return isReleased(s.air_date); // strict check
            });

            if (releasedSeasons.length > 0) {
                totalSeasons = releasedSeasons.length;
                totalEpisodes = releasedSeasons.reduce((acc: number, s: any) => acc + (s.episode_count || 0), 0);
                seasonsList = releasedSeasons;
            }
        }

        if (!totalSeasons && !media.number_of_seasons) return null;

        const watchlistItem = watchlist.find(i => i.tmdb_id === media.id && i.type === 'show');
        const lastWatched = watchlistItem?.last_watched_season || 0;

        const remainingSeasons = Math.max(0, totalSeasons - lastWatched);

        let remainingEpisodes = totalEpisodes;
        if (seasonsList && Array.isArray(seasonsList)) {
            remainingEpisodes = seasonsList.reduce((acc: number, season: any) => {
                if (season.season_number > 0 && season.season_number > lastWatched) {
                    let count = season.episode_count || 0;

                    // Cap based on Next/Last episode anchors to avoid counting unaired episodes
                    if (media.next_episode_to_air) {
                        const nextSeason = media.next_episode_to_air.season_number;
                        const nextEpNum = media.next_episode_to_air.episode_number;

                        if (season.season_number === nextSeason) {
                            count = Math.max(0, nextEpNum - 1);
                        } else if (season.season_number > nextSeason) {
                            count = 0;
                        }
                    } else if (media.last_episode_to_air) {
                        const lastSeason = media.last_episode_to_air.season_number;
                        const lastEp = media.last_episode_to_air.episode_number;
                        if (season.season_number > lastSeason) count = 0;
                        else if (season.season_number === lastSeason) count = lastEp;
                    }

                    return acc + count;
                }
                return acc;
            }, 0);
        } else {
            // Fallback estimate
            if (totalSeasons > 0) {
                const avgEps = totalEpisodes / totalSeasons;
                remainingEpisodes = Math.round(remainingEpisodes - (lastWatched * avgEps));
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

        if (stats) {
            const totalMinutes = stats.remainingEpisodes * avgRuntime;
            if (totalMinutes <= 0) return null;

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

    // Render Logic using Safe Types
    const status = media.status;
    const isMovieOTT = status === 'movie_on_ott' || media.tabCategory === 'ott';
    const isMovieComingSoon = status === 'movie_coming_soon' || media.tabCategory === 'coming_soon';

    // Helper to format consistent dates
    // Using dateUtils formatDisplayDate which gives "19 Jan 2024"
    const getFormattedDate = (dateStr: string | undefined): string => {
        return formatDisplayDate(dateStr);
    };

    let providerName = '';
    let formattedDate = '';
    let label = '';
    let labelColor = '';
    let contextLabel = '';

    if (isTV) {
        const nextEp = media.next_episode_to_air;
        let nextEpDate = nextEp?.air_date;
        let seasonNumber = nextEp?.season_number;
        let episodeNumber = nextEp?.episode_number;

        // Fallback to searching seasons if next_episode_to_air is missing but we have season data
        if (!nextEpDate && media.seasons && Array.isArray(media.seasons)) {
            const today = getTodayValues(); // from dateUtils
            const futureSeason = media.seasons.find((s: any) => s.air_date && parseDate(s.air_date)! >= today);
            if (futureSeason) {
                nextEpDate = futureSeason.air_date;
                seasonNumber = futureSeason.season_number;
                episodeNumber = 1;
            }
        }

        const dateStr = nextEpDate || media.first_air_date || media.release_date;
        formattedDate = getFormattedDate(dateStr);

        if (isMovieOTT) {
            const providers = media['watch/providers']?.results?.[region];
            providerName = providers?.flatrate?.[0]?.provider_name ||
                providers?.ads?.[0]?.provider_name ||
                providers?.free?.[0]?.provider_name || 'OTT';
        }

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
    } else if (isMovieOTT) {
        const dateStr = media.manual_date_override ? media.digital_release_date : media.release_date;
        formattedDate = getFormattedDate(dateStr);

        const providers = media['watch/providers']?.results?.[region];
        providerName = providers?.flatrate?.[0]?.provider_name ||
            providers?.ads?.[0]?.provider_name ||
            providers?.free?.[0]?.provider_name || 'OTT';
        contextLabel = 'New Movie';
    } else if (isMovieComingSoon) {
        const dateStr = media.manual_date_override ? media.digital_release_date : (media.theatrical_release_date || media.release_date);
        formattedDate = getFormattedDate(dateStr);

        const isInTheatres = isReleased(dateStr); // <= Today
        label = isInTheatres ? 'In Theatres' : 'Coming Soon';
        labelColor = isInTheatres ? 'text-amber-400 border-amber-500/30' : 'text-blue-400 border-blue-500/30';
        contextLabel = 'New Movie';
    }

    if (!isTV && !isMovieOTT && !isMovieComingSoon) return null;

    return (
        <div className="media-card group" onClick={() => onClick(media)}>
            <div className="poster-wrapper">
                <img src={imageUrl} alt={title} className="poster-img" loading="lazy" />

                {/* Stats Pills */}
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

                {/* Bottom Info Stack */}
                <div className="discovery-info-stack">
                    {contextLabel && (
                        <div className="media-pill" style={{ backgroundColor: 'rgba(20, 20, 20, 0.8)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                            <span className="text-gray-300">{contextLabel}</span>
                        </div>
                    )}
                    <h4 className="discovery-title line-clamp-2">{title}</h4>
                </div>

                {/* Actions Stack */}
                <div className="card-actions-stack">
                    {showDateOverride &&
                        (media.media_type === 'movie' || media.tmdbMediaType === 'movie') &&
                        media.seasonInfo === 'Released' && (
                            <button
                                className="add-btn bg-white/10 hover:bg-white/20 text-white"
                                onClick={(e) => { e.stopPropagation(); onSetDate(media); }}
                                title="Set Release Date"
                            >
                                <Calendar size={16} />
                            </button>
                        )}
                    {media.countdown !== undefined && media.countdown <= 0 && (
                        <button
                            className="add-btn bg-teal-500 text-black shadow-[0_0_10px_rgba(45,212,191,0.5)] border-teal-500 animate-pulse-slow"
                            onClick={(e) => { e.stopPropagation(); onMoveToLibrary(media); }}
                            title="Move to Library"
                        >
                            <ArrowUp size={16} strokeWidth={3} />
                        </button>
                    )}
                    {(!((media.status === 'show_new') && media.countdown !== undefined && media.countdown > 0)) && (
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
                {(isMovieOTT && media.manual_date_override) && (
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
