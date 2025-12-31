import { type TMDBMedia } from '../lib/tmdb';

export const calculateShowStats = (media: TMDBMedia | null, details: any | null) => {
    if (!media && !details) return null;

    // We can't really determine type here easily without passing it, but usually this is called for TV shows.
    // The calling component checks type === 'tv'. 
    // Or we can check for season/episode properties.

    // Default to 0
    let avgRuntime = 0;

    // 1. Prefer tvmaze_runtime if available (often most accurate for some scraping contexts)
    if (media?.tvmaze_runtime) {
        avgRuntime = media.tvmaze_runtime;
    }
    // 2. Then check details episode_run_time (array) - usually checking the shortest can be misleading if it includes specials, 
    // but the previous logic used Math.min. User wants "average", Math.min might be "min". 
    // TMDB often returns [45, 60]. Average would be 52. 
    // The previous logic was Math.min(...details.episode_run_time). keeping it for consistency unless I see a reason to change.
    // Actually, widespread practice: if multiple runtimes, usually the first one or average is used. 
    // The previous code used Math.min. I will stick to the previous priority order to maintain specific behavior but centralized.
    else if (details?.episode_run_time && details.episode_run_time.length > 0) {
        avgRuntime = Math.min(...details.episode_run_time);
    }
    else if (media?.episode_run_time && media.episode_run_time.length > 0) {
        avgRuntime = Math.min(...media.episode_run_time);
    }
    // 3. Fallback to last_episode_to_air
    else if (media?.last_episode_to_air?.runtime) {
        avgRuntime = media.last_episode_to_air.runtime;
    }
    else if (details?.last_episode_to_air?.runtime) {
        avgRuntime = details.last_episode_to_air.runtime;
    }
    // 4. Fallback to generic runtime
    else if (details?.runtime) {
        avgRuntime = details.runtime;
    }
    else if (media?.runtime) {
        avgRuntime = media.runtime;
    }


    let episodes = details?.number_of_episodes || media?.number_of_episodes || 0;
    let seasons = details?.number_of_seasons || media?.number_of_seasons || 0;

    // Recalculate stats to exclude future/announced seasons
    if (details?.seasons && Array.isArray(details.seasons)) {
        let validSeasons = 0;
        let validEpisodes = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        details.seasons.forEach((season: any) => {
            if (season.season_number === 0) return; // Usually specials are not counted in "Seasons" count

            let isFuture = false;
            if (season.air_date) {
                if (season.air_date > todayStr) isFuture = true;
            } else if (season.episode_count === 0 || (details.status !== 'Ended' && details.status !== 'Canceled')) {
                isFuture = true;
            }

            if (!isFuture) {
                validSeasons++;
                validEpisodes += season.episode_count;
            }
        });

        // Only override if we found valid data structure
        if (details.seasons.length > 0) {
            seasons = validSeasons;
            episodes = validEpisodes;
        }
    }

    let bingeTime = '';
    if (avgRuntime && episodes) {
        const totalMinutes = avgRuntime * episodes;
        const days = Math.floor(totalMinutes / (24 * 60));
        const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
        const minutes = totalMinutes % 60;

        if (days > 0) {
            bingeTime = `${days}d ${hours}h`;
        } else {
            bingeTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
    }

    return { avgRuntime, episodes, seasons, bingeTime };
};

export const getWatchProviders = (media: TMDBMedia | null, details: any | null, region: string) => {
    const getFromSource = (source: any) => {
        const rData = source?.['watch/providers']?.results?.[region];
        if (!rData) return [];
        return [
            ...(rData.flatrate || []),
            ...(rData.free || []),
            ...(rData.ads || [])
        ];
    };

    const fromDetails = getFromSource(details);
    if (fromDetails.length > 0) return fromDetails;
    return getFromSource(media);
};

export const getWatchLink = (media: TMDBMedia | null, details: any | null, region: string) => {
    return details?.['watch/providers']?.results?.[region]?.link ||
        media?.['watch/providers']?.results?.[region]?.link;
};