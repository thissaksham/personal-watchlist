import { tmdb } from '../../../lib/tmdb';
import { parseDateLocal } from '../../../lib/dateUtils';
import type { WatchStatus } from '../../../types';

export const pruneMetadata = (meta: any, region: string) => {
    if (!meta) return meta;

    // 1. Strict Filter Providers (Only Current Region)
    const providers = meta['watch/providers']?.results;
    let leanProviders = {};
    if (providers && providers[region]) {
        leanProviders = {
            results: {
                [region]: providers[region]
            }
        };
    }

    // 2. Prune Videos (Keep only first trailer)
    let leanVideos = meta.videos;
    if (meta.videos?.results) {
        const trailer = meta.videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
        if (trailer) {
            leanVideos = { results: [trailer] };
        } else {
            leanVideos = { results: [] };
        }
    }

    // 3. Whitelist Essential Keys
    const {
        backdrop_path, overview,
        release_date, first_air_date, runtime, status,
        next_episode_to_air, last_episode_to_air, seasons, external_ids,
        genres, number_of_episodes, number_of_seasons,
        episode_run_time, tvmaze_runtime,
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

export const getEnrichedMetadata = async (tmdbId: number, type: 'movie' | 'show', region: string, existingMetadata?: any, currentStatus?: WatchStatus) => {
    const tmdbType = type === 'show' ? 'tv' : 'movie';
    const [details, releaseData] = await Promise.all([
        tmdb.getDetails(tmdbId, tmdbType, region),
        tmdbType === 'movie' ? tmdb.getReleaseDates(tmdbId) : Promise.resolve({ results: [] })
    ]);

    let theatricalDate = null;
    let indianDigitalDate = null;
    let indianDigitalNote = null;

    if (tmdbType === 'movie') {
        const results = releaseData?.results || [];
        const extractDates = (regionCode: string) => {
            const regionData = results.find((r: any) => r.iso_3166_1 === regionCode);
            if (!regionData?.release_dates) return null;
            const theatrical = regionData.release_dates.find((d: any) => d.type === 3) || regionData.release_dates.find((d: any) => d.type === 2);
            // Priority: Digital (4) -> Physical (5) (Often proxy for Rental/VOD)
            const digital = regionData.release_dates.find((d: any) => d.type === 4) || regionData.release_dates.find((d: any) => d.type === 5);
            return {
                theatrical: theatrical?.release_date,
                digital: digital?.release_date,
                digitalNote: digital?.note || null,
                hasData: !!(theatrical || digital)
            };
        };
        const inDates = extractDates(region);
        if (inDates?.digital) {
            indianDigitalDate = inDates.digital;
            indianDigitalNote = inDates.digitalNote;
        }
        if (inDates?.theatrical) {
            theatricalDate = inDates.theatrical;
        }

        // Global Theatrical Fallback
        if (!theatricalDate && results.length > 0) {
            let earliestDate = null;
            for (const res of results) {
                if (!res.release_dates || !Array.isArray(res.release_dates)) continue;

                for (const d of res.release_dates) {
                    if (d.type === 2 || d.type === 3 || d.type === 4) {
                        if (d.release_date) {
                            if (!earliestDate || d.release_date < earliestDate) {
                                earliestDate = d.release_date;
                            }
                        }
                    }
                }
            }
            if (earliestDate) theatricalDate = earliestDate;
        }
    }

    let tvmazeRuntime = null;
    if (tmdbType === 'tv' && details.external_ids?.imdb_id) {
        try {
            const tvmRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${details.external_ids.imdb_id}`);
            if (tvmRes.ok) {
                const tvmData = await tvmRes.json();
                tvmazeRuntime = tvmData.averageRuntime || null;
            }
        } catch (e) { console.warn("TVMaze failed", e); }
    }

    const providers = details['watch/providers']?.results?.[region] || {};
    const allStreamingOrRental = [
        ...(providers.flatrate || []),
        ...(providers.ads || []),
        ...(providers.free || []),
        ...(providers.rent || []),
        ...(providers.buy || [])
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let initialStatus: WatchStatus = type === 'movie' ? 'movie_unwatched' : 'show_new';
    let movedToLibrary = true;

    if (tmdbType === 'movie') {
        let releaseDateStr = details.release_date;
        if (theatricalDate && (!releaseDateStr || theatricalDate < releaseDateStr)) {
            releaseDateStr = theatricalDate;
        }
        const releaseDateObj = parseDateLocal(releaseDateStr);
        const hasProvidersIN = allStreamingOrRental.length > 0;
        const indianDigDateObj = parseDateLocal(indianDigitalDate);
        const hasFutureIndianDigitalDate = indianDigDateObj && indianDigDateObj > today;
        const hasManualOverride = (existingMetadata as any)?.manual_date_override;

        // Fix: Allow moving to OTT if:
        // 1. It is currently in 'Coming Soon'
        // 2. It is 'Released' (Theatrical/General date passed)
        // 3. It has ANY valid digital date (even if past/today)
        // 4. Note: If providers exist, logic at line 166 handles it. This covers cases with Date but No Providers.
        const isReleased = !releaseDateObj || releaseDateObj <= today;
        const hasValidDigitalTransition = currentStatus === 'movie_coming_soon' && isReleased && !!indianDigDateObj;

        let isAvailableGlobally = false;
        if (releaseDateObj) {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            if (releaseDateObj < sixMonthsAgo) {
                const allProviders = details['watch/providers']?.results || {};
                for (const r in allProviders) {
                    const p = allProviders[r];
                    if ((p.flatrate || []).length > 0 || (p.rent || []).length > 0 || (p.buy || []).length > 0) {
                        isAvailableGlobally = true;
                        break;
                    }
                }
            }
        }

        if (hasProvidersIN && (!releaseDateObj || releaseDateObj <= today)) {
            if (!currentStatus) {
                movedToLibrary = true;
                initialStatus = 'movie_unwatched';
            } else if (currentStatus === 'movie_coming_soon') {
                movedToLibrary = false;
                initialStatus = 'movie_on_ott';
            } else {
                movedToLibrary = true;
                initialStatus = currentStatus === 'movie_watched' ? 'movie_watched' : 'movie_unwatched';
            }
        } else if (hasProvidersIN || hasFutureIndianDigitalDate || hasValidDigitalTransition || hasManualOverride) {
            if (!currentStatus || currentStatus === 'movie_coming_soon' || hasManualOverride || hasProvidersIN) {
                movedToLibrary = false;
                initialStatus = 'movie_on_ott';
            } else {
                movedToLibrary = true;
                initialStatus = 'movie_unwatched';
            }
        } else if (isAvailableGlobally) {
            if (!currentStatus) {
                movedToLibrary = true;
                initialStatus = 'movie_unwatched';
            } else if (currentStatus === 'movie_coming_soon') {
                movedToLibrary = false;
                initialStatus = 'movie_on_ott';
            } else {
                movedToLibrary = true;
                initialStatus = 'movie_unwatched';
            }
        } else if (releaseDateObj && releaseDateObj < new Date(new Date().setFullYear(new Date().getFullYear() - 1))) {
            if (!currentStatus) {
                movedToLibrary = true;
                initialStatus = 'movie_unwatched';
            } else if (currentStatus === 'movie_coming_soon') {
                movedToLibrary = false;
                initialStatus = 'movie_on_ott';
            } else {
                movedToLibrary = true;
                initialStatus = 'movie_unwatched';
            }
        } else {
            movedToLibrary = false;
            initialStatus = 'movie_coming_soon';
        }

        if (currentStatus === 'movie_on_ott' && initialStatus === 'movie_unwatched') {
            initialStatus = 'movie_on_ott';
            movedToLibrary = false;
        }
        if (currentStatus === 'movie_watched') {
            initialStatus = 'movie_watched';
            movedToLibrary = true;
        }
    } else {
        // Show Logic - Initial Setup
        const lastEp = details.last_episode_to_air;
        // const lastWatched = existingMetadata?.last_watched_season || 0; 
        // Note: For full status calculation we use determineShowStatus separately. 
        // This part just sets "Initial" status for new adds or refresh base.

        if (!lastEp) {
            initialStatus = 'show_new';
            movedToLibrary = false;
        } else {
            if (!currentStatus) {
                const status = details.status;
                const type = details.type;
                const isFinished = status === 'Ended' || status === 'Canceled' || status === 'Miniseries' || type === 'Miniseries';
                const isNew = status === 'Planned' || status === 'In Production' || status === 'Pilot' || status === 'Rumored';

                if (isNew) initialStatus = 'show_new';
                else if (isFinished) initialStatus = 'show_finished';
                else initialStatus = 'show_ongoing';

                if (initialStatus === 'show_new') movedToLibrary = false;
                else movedToLibrary = true;
            } else {
                initialStatus = currentStatus;
                movedToLibrary = true;
            }
        }
    }

    const oldSeasonsCount = existingMetadata?.number_of_seasons || 0;
    const newSeasonsCount = details.number_of_seasons || 0;

    // Auto-Restore Logic: If a new season is added, un-dismiss the show
    let isDismissed = existingMetadata?.dismissed_from_upcoming;
    if (isDismissed && newSeasonsCount > oldSeasonsCount) {
        console.log(`[Auto-Restore] New season detected for ${details.name || details.title}. Restoring to Upcoming.`);
        isDismissed = false;
    }

    const { credits, production_companies, images, videos, reviews, ...leanDetails } = details as any;
    const finalMetadata = {
        ...(existingMetadata || {}),
        ...leanDetails,
        tvmaze_runtime: tvmazeRuntime,
        digital_release_date: indianDigitalDate || (existingMetadata?.manual_date_override ? (existingMetadata.digital_release_date) : null),
        digital_release_note: indianDigitalDate ? indianDigitalNote : (existingMetadata?.manual_date_override ? (existingMetadata.digital_release_note) : null),
        theatrical_release_date: theatricalDate || existingMetadata?.theatrical_release_date,
        manual_date_override: indianDigitalDate ? false : !!existingMetadata?.manual_date_override,
        moved_to_library: movedToLibrary,
        dismissed_from_upcoming: isDismissed
    };

    return { initialStatus, finalMetadata, movedToLibrary };
};
