import type { TMDBMedia } from './tmdb';
import { parseDateLocal, getTodayValues } from './dateUtils';
import type { WatchStatus } from '../types';

export type { WatchStatus };

export const determineShowStatus = (metadata: TMDBMedia & { type?: string }, lastWatchedSeason: number, progress: number = 0): WatchStatus => {
    if (lastWatchedSeason === 0 && progress > 0) return 'show_watching';
    const seasons = (metadata.seasons || []) as any[]; // Cast to any to access properties safely if TMDBMedia uses any[]
    const today = getTodayValues();
    const releasedSeasons = seasons.filter((s) => s.season_number > 0 && s.air_date && parseDateLocal(s.air_date)! <= today);
    const totalReleased = releasedSeasons.length;

    if (totalReleased === 0) return metadata.last_episode_to_air ? 'show_ongoing' : 'show_new';
    if (lastWatchedSeason === 0) {
        const isFinished = metadata.status === 'Ended' || metadata.status === 'Canceled' || metadata.type === 'Miniseries';
        return isFinished ? 'show_finished' : 'show_ongoing';
    }
    if (lastWatchedSeason < totalReleased) return 'show_watching';

    if (metadata.next_episode_to_air?.air_date) {
        const nextDate = parseDateLocal(metadata.next_episode_to_air.air_date);
        if (nextDate && nextDate > today) {
            return metadata.next_episode_to_air.season_number === lastWatchedSeason ? 'show_watching' : 'show_returning';
        }
    }
    return 'show_watched';
};

export const pruneMetadata = (meta: any, region: string) => {
    if (!meta) return meta;
    const providers = meta['watch/providers']?.results;
    let leanProviders = {};
    if (providers && providers[region]) {
        leanProviders = { results: { [region]: providers[region] } };
    }
    let leanVideos = meta.videos;
    if (meta.videos?.results) {
        const trailer = meta.videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
        leanVideos = trailer ? { results: [trailer] } : { results: [] };
    }
    // Whitelist
    const {
        backdrop_path, overview, release_date, first_air_date, runtime, status,
        next_episode_to_air, last_episode_to_air, seasons, external_ids,
        genres, number_of_episodes, number_of_seasons, episode_run_time, tvmaze_runtime,
        digital_release_date, digital_release_note, theatrical_release_date, moved_to_library,
        manual_date_override, manual_ott_name, dismissed_from_upcoming, last_updated_at
    } = meta;

    return {
        title: meta.title || meta.name,
        name: meta.name || meta.title,
        poster_path: meta.poster_path,
        backdrop_path, overview,
        vote_average: meta.vote_average,
        release_date, first_air_date, runtime, status,
        next_episode_to_air, last_episode_to_air, seasons, external_ids,
        genres, number_of_episodes, number_of_seasons,
        episode_run_time, tvmaze_runtime,
        digital_release_date, digital_release_note, theatrical_release_date, moved_to_library,
        manual_date_override, manual_ott_name, dismissed_from_upcoming, last_updated_at,
        'watch/providers': leanProviders,
        videos: leanVideos
    };
};
