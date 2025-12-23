import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { tmdb, type TMDBMedia, TMDB_REGION } from '../lib/tmdb';

export interface WatchlistItem {
    id: string; // database uuid
    tmdb_id: number;
    type: 'movie' | 'show';
    title: string;
    poster_path: string | null;
    vote_average: number;
    status: 'watched' | 'unwatched' | 'plan_to_watch' | 'dropped' | 'movie_on_ott' | 'movie_coming_soon' | 'show_finished' | 'show_ongoing' | 'show_watched' | 'show_watching' | 'show_returning' | 'show_new' | 'watching';
    metadata?: TMDBMedia;
    last_watched_season?: number;
}

interface WatchlistContextType {
    watchlist: WatchlistItem[];
    addToWatchlist: (media: TMDBMedia, type: 'movie' | 'show') => Promise<void>;
    removeFromWatchlist: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    markAsWatched: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    markAsUnwatched: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    moveToLibrary: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    isInWatchlist: (tmdbId: number, type: 'movie' | 'show') => boolean;
    loading: boolean;
    watchedSeasons: never; // Deprecated
    markSeasonWatched: (tmdbId: number, seasonNumber: number) => Promise<void>;
    markSeasonUnwatched: (tmdbId: number, seasonNumber: number) => Promise<void>;
    dismissFromUpcoming: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    restoreToUpcoming: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    updateWatchlistItemMetadata: (tmdbId: number, type: 'movie' | 'show', newMetadata: any) => Promise<void>;
    updateStatus: (tmdbId: number, type: 'movie' | 'show', newStatus: WatchlistItem['status']) => Promise<void>;
    refreshMetadata: (tmdbId: number, type: 'movie' | 'show', overrideMetadata?: any) => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(false);
    // V3: last_watched_season replaces watchedSeasons set. No separate state needed.

    useEffect(() => {
        if (user) {
            fetchWatchlist();
            // fetchWatchedSeasons(); // Deprecated V3
        } else {
            const localWl = JSON.parse(localStorage.getItem('watchlist') || '[]');
            setWatchlist(localWl);
        }
    }, [user]);

    const fetchWatchlist = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('watchlist')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching watchlist:', error);
        } else {
            setWatchlist(data || []);
        }
        setLoading(false);
    };

    // fetchWatchedSeasons Deprecated V3

    // Helper to reduce storage size (Data Diet)
    const pruneMetadata = (meta: any) => {
        if (!meta) return meta;

        // 1. Strict Filter Providers (Only India)
        const providers = meta['watch/providers']?.results;
        let leanProviders = {};
        if (providers && providers[TMDB_REGION]) {
            leanProviders = {
                results: {
                    [TMDB_REGION]: providers[TMDB_REGION]
                }
            };
        } else if (providers && providers['IN']) {
            leanProviders = {
                results: {
                    ['IN']: providers['IN']
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
            next_episode_to_air, seasons, external_ids,
            genres, number_of_episodes, number_of_seasons,
            episode_run_time, tvmaze_runtime,
            digital_release_date, digital_release_note, theatrical_release_date, moved_to_library,
            manual_date_override, manual_ott_name, dismissed_from_upcoming
        } = meta;

        return {
            title: meta.title || meta.name,
            name: meta.name || meta.title,
            poster_path: meta.poster_path,
            backdrop_path, overview,
            vote_average: meta.vote_average,
            release_date, first_air_date, runtime, status,
            next_episode_to_air, seasons, external_ids,
            genres, number_of_episodes, number_of_seasons,
            episode_run_time, tvmaze_runtime,
            digital_release_date, digital_release_note, theatrical_release_date, moved_to_library,
            manual_date_override, manual_ott_name, dismissed_from_upcoming,
            'watch/providers': leanProviders,
            videos: leanVideos
        };
    };

    const getEnrichedMetadata = async (tmdbId: number, type: 'movie' | 'show', existingMetadata?: any, currentStatus?: WatchlistItem['status']) => {
        const tmdbType = type === 'show' ? 'tv' : 'movie';
        const [details, releaseData] = await Promise.all([
            tmdb.getDetails(tmdbId, tmdbType),
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
                const theatrical = regionData.release_dates.find((d: any) => d.type === 3);
                const digital = regionData.release_dates.find((d: any) => d.type === 4);
                return {
                    theatrical: theatrical?.release_date,
                    digital: digital?.release_date,
                    digitalNote: digital?.note || null,
                    hasData: !!(theatrical || digital)
                };
            };
            let inDates = extractDates(TMDB_REGION);
            if (inDates?.digital) {
                indianDigitalDate = inDates.digital;
                indianDigitalNote = inDates.digitalNote;
            }
            if (inDates?.theatrical) {
                theatricalDate = inDates.theatrical;
            }

            // Global Theatrical Fallback (Only for Coming Soon UI)
            if (!theatricalDate && results.length > 0) {
                for (const res of results) {
                    const d = extractDates(res.iso_3166_1);
                    if (d?.theatrical) { theatricalDate = d.theatrical; break; }
                }
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

        const providers = details['watch/providers']?.results?.[TMDB_REGION] || {};
        const allStreamingOrRental = [
            ...(providers.flatrate || []),
            ...(providers.ads || []),
            ...(providers.free || []),
            ...(providers.rent || []),
            ...(providers.buy || [])
        ];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let initialStatus: WatchlistItem['status'] = 'unwatched';
        let movedToLibrary = true;

        if (tmdbType === 'movie') {
            const releaseDateStr = details.release_date;
            const releaseDateObj = releaseDateStr ? new Date(releaseDateStr) : null;
            const hasProvidersIN = allStreamingOrRental.length > 0;
            const hasFutureIndianDigitalDate = indianDigitalDate && new Date(indianDigitalDate) > today;
            const hasManualOverride = (existingMetadata as any)?.manual_date_override;

            let isAvailableGlobally = false;
            if (releaseDateObj) {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                if (releaseDateObj < sixMonthsAgo) {
                    const allProviders = details['watch/providers']?.results || {};
                    for (const region in allProviders) {
                        const p = allProviders[region];
                        if ((p.flatrate || []).length > 0 || (p.rent || []).length > 0 || (p.buy || []).length > 0) {
                            isAvailableGlobally = true;
                            break;
                        }
                    }
                }
            }

            if (hasProvidersIN) {
                // Step 1: Streaming in India
                if (!currentStatus) {
                    // Scenario 1: Add movie from search -> Library
                    movedToLibrary = true;
                    initialStatus = 'unwatched';
                } else {
                    // Scenario 2/3: Background Refresh -> move to or keep in movie_on_ott
                    movedToLibrary = false;
                    initialStatus = 'movie_on_ott';
                }
            } else if (hasFutureIndianDigitalDate || hasManualOverride) {
                // Step 2: Upcoming Digital in India or Manual Override
                movedToLibrary = false;
                initialStatus = 'movie_on_ott';
            } else if (isAvailableGlobally) {
                // Step 3: Available Globally + 6 months old
                movedToLibrary = true;
                initialStatus = 'unwatched';
            } else if (releaseDateObj && releaseDateObj < new Date(new Date().setFullYear(new Date().getFullYear() - 1))) {
                // Step 4: Older than 1 year fallback
                movedToLibrary = true;
                initialStatus = 'unwatched';
            } else {
                // Step 5: Default Coming Soon
                movedToLibrary = false;
                initialStatus = 'movie_coming_soon';
            }

            // Scenario 3 Protection: Sticky On OTT
            if (currentStatus === 'movie_on_ott' && initialStatus === 'unwatched') {
                initialStatus = 'movie_on_ott';
                movedToLibrary = false;
            }
            // Watched status remains watched
            if (currentStatus === 'watched') {
                initialStatus = 'watched';
                movedToLibrary = true;
            }
        } else {
            // TV Show Logic V3

            const lastEp = details.last_episode_to_air;
            const lastWatched = existingMetadata?.last_watched_season || 0;

            if (!lastEp) {
                // No aired episodes -> show_new
                initialStatus = 'show_new';
                movedToLibrary = false;
            } else {
                // Has aired content
                const isEnded = details.status === 'Ended' || details.status === 'Canceled';

                if (lastWatched === 0 && !currentStatus) {
                    // Not started
                    if (isEnded) initialStatus = 'show_finished';
                    else initialStatus = 'show_ongoing';
                    movedToLibrary = true; // "To Watch" tab
                } else {
                    // Started or Refreshing
                    // logic handled by recalculateShowStatus usually, but for initial/enrich:
                    // We rely on currentStatus if valid, or recalculate logic?
                    // Let's implement basic checks for initial add
                    if (currentStatus) {
                        initialStatus = currentStatus;
                        movedToLibrary = true;
                    } else {
                        // Default to show_ongoing logic if lastWatched is 0
                        if (isEnded) initialStatus = 'show_finished';
                        else initialStatus = 'show_ongoing';
                        movedToLibrary = true;
                    }
                }
            }
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
            moved_to_library: movedToLibrary
        };

        return { initialStatus, finalMetadata, movedToLibrary };
    };

    const addToWatchlist = async (media: TMDBMedia, type: 'movie' | 'show') => {
        const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}-${Math.random()}`;

        const newItemBase: any = {
            id: tempId,
            user_id: user?.id || 'local-user',
            tmdb_id: media.id,
            type: type,
            title: media.title || media.name || 'Unknown',
            poster_path: media.poster_path,
            vote_average: media.vote_average,
            status: 'plan_to_watch'
        };

        const { initialStatus, finalMetadata } = await getEnrichedMetadata(media.id, type, media);
        const prunedMetadata = pruneMetadata(finalMetadata);
        const finalItem = { ...newItemBase, status: initialStatus, metadata: prunedMetadata };

        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            const cleaned = local.filter((item: any) => !(item.tmdb_id == media.id && item.type === type));
            const updated = [finalItem, ...cleaned];
            localStorage.setItem('watchlist', JSON.stringify(updated));
            setWatchlist(updated);
            return;
        }

        const { data: insertedData, error } = await supabase.from('watchlist').insert(finalItem).select().single();
        if (error) {
            console.error('Watchlist Insert Error:', error);
            if (error.code === '23503') {
                alert('Session Error: Please Sign Out and Log In again.');
            } else {
                alert('Error adding to watchlist: ' + error.message);
            }
        } else if (insertedData) {
            setWatchlist((prev) => [insertedData, ...prev]);
        }
    };

    const removeFromWatchlist = async (tmdbId: number, type: 'movie' | 'show') => {
        setWatchlist((prev) => prev.filter((item) => !(item.tmdb_id == tmdbId && item.type === type)));

        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.filter((item: any) => !(item.tmdb_id == tmdbId && item.type === type))));
            // V3: No separate watched_seasons to clean up here for local
            return;
        }

        const { error } = await supabase.from('watchlist').delete().eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
        if (error) console.error('Error removing from watchlist:', error);
    };

    const markAsWatched = async (tmdbId: number, type: 'movie' | 'show') => {
        let newStatus: WatchlistItem['status'] = 'watched';

        if (type === 'show') {
            const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === 'show');
            const meta = item?.metadata;

            let seasons = meta?.seasons;
            if (!seasons) {
                try {
                    const details = await tmdb.getDetails(tmdbId, 'tv');
                    seasons = details.seasons || [];
                } catch (e) { seasons = []; }
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // For V3: Mark as watched means last_watched_season = total seasons
            // But strict linear progress means we should probably set it to the max season number.
            const released = (seasons || []).filter((s: any) => s.season_number > 0 && s.air_date && new Date(s.air_date) <= today);
            const maxSeason = released.length > 0 ? released[released.length - 1].season_number : 0;

            await updateWatchlistItemMetadata(tmdbId, 'show', { ...(item?.metadata || {}), last_watched_season: maxSeason, seasons: seasons });

            // Update LOCAL State (Optimistic)
            setWatchlist(prev => prev.map(i => {
                if (i.tmdb_id === tmdbId && i.type === 'show') {
                    const newMeta = { ...(i.metadata || {}), last_watched_season: maxSeason, seasons: seasons } as any;
                    return { ...i, last_watched_season: maxSeason, metadata: newMeta };
                }
                return i;
            }));

            // Force DB update for top-level last_watched_season
            if (user) {
                await supabase.from('watchlist').update({ last_watched_season: maxSeason }).eq('user_id', user.id).eq('tmdb_id', tmdbId);
            } else {
                const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
                const updatedLocal = local.map((i: any) => (i.tmdb_id === tmdbId && i.type === 'show') ? { ...i, last_watched_season: maxSeason, metadata: { ...(item?.metadata || {}), last_watched_season: maxSeason, seasons: seasons } } : i);
                localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
            }

            // Recalculate status with FRESH metadata
            await recalculateShowStatus(tmdbId, maxSeason, { ...(item?.metadata || {}), last_watched_season: maxSeason, seasons: seasons });
            return;
        }

        setWatchlist((prev) => prev.map(item => (item.tmdb_id === tmdbId && item.type === type) ? { ...item, status: newStatus } : item));
        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, status: newStatus } : i)));
            return;
        }

        await supabase.from('watchlist').update({ status: newStatus }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
    };

    const moveToLibrary = async (tmdbId: number, type: 'movie' | 'show') => {
        setWatchlist((prev) => prev.map(item => {
            if (item.tmdb_id === tmdbId && item.type === type) {
                const newMeta = { ...(item.metadata || {}), moved_to_library: true } as TMDBMedia;
                return { ...item, status: 'unwatched', metadata: newMeta };
            }
            return item;
        }));

        if (!user) return;

        const currentItem = watchlist.find(i => i.tmdb_id === tmdbId && i.type === type);
        if (currentItem) {
            const newMeta = { ...(currentItem.metadata || {}), moved_to_library: true };
            const pruned = pruneMetadata(newMeta);
            await supabase.from('watchlist').update({ status: 'unwatched', metadata: pruned }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
        }
    };

    const markAsUnwatched = async (tmdbId: number, type: 'movie' | 'show') => {
        if (type === 'show') {
            // Mark as unwatched means 0 progress
            await updateWatchlistItemMetadata(tmdbId, 'show', { ...((watchlist.find(i => i.tmdb_id === tmdbId)?.metadata) || {}), last_watched_season: 0 });

            // Update LOCAL State (Optimistic)
            setWatchlist(prev => prev.map(i => {
                if (i.tmdb_id === tmdbId && i.type === 'show') {
                    const newMeta = { ...(i.metadata || {}), last_watched_season: 0 } as any;
                    return { ...i, last_watched_season: 0, metadata: newMeta };
                }
                return i;
            }));

            if (user) {
                await supabase.from('watchlist').update({ last_watched_season: 0 }).eq('user_id', user.id).eq('tmdb_id', tmdbId);
            } else {
                const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
                const updatedLocal = local.map((i: any) => (i.tmdb_id === tmdbId && i.type === 'show') ? { ...i, last_watched_season: 0, metadata: { ...((watchlist.find(j => j.tmdb_id === tmdbId)?.metadata) || {}), last_watched_season: 0 } } : i);
                localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
            }

            await recalculateShowStatus(tmdbId, 0, { ...((watchlist.find(i => i.tmdb_id === tmdbId)?.metadata) || {}), last_watched_season: 0 });
            return;
        }

        setWatchlist((prev) => prev.map(item => (item.tmdb_id === tmdbId && item.type === type) ? { ...item, status: 'unwatched' } : item));
        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, status: 'unwatched' } : i)));
            return;
        }
        await supabase.from('watchlist').update({ status: 'unwatched' }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
    };

    const isInWatchlist = (tmdbId: number, type: 'movie' | 'show') => {
        return watchlist.some((item) => item.tmdb_id == tmdbId && item.type === type);
    };

    const recalculateShowStatus = async (tmdbId: number, lastWatchedSeason: number, overrideMetadata?: any) => {
        const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === 'show');
        if (!item) return;

        const meta = overrideMetadata || item.metadata;
        let seasons = meta?.seasons || [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter released seasons
        // NOTE: TMDB/TVMaze usually gives reliable season numbers.
        const releasedSeasons = (seasons || []).filter((s: any) => s.season_number > 0 && s.air_date && new Date(s.air_date) <= today);
        const totalReleased = releasedSeasons.length;

        let newStatus: WatchlistItem['status'] = 'show_ongoing'; // default fallback

        if (totalReleased === 0) {
            // No aired contents but might be show_new if no episodes at all
            if (!meta?.last_episode_to_air) {
                newStatus = 'show_new';
            } else {
                // Has aired before? but noreleased seasons? Weird edge case.
                newStatus = 'show_ongoing';
            }
        } else if (lastWatchedSeason === 0) {
            // Not started
            const isEnded = meta?.status === 'Ended' || meta?.status === 'Canceled';
            newStatus = isEnded ? 'show_finished' : 'show_ongoing';
        } else {
            // Started
            if (lastWatchedSeason < totalReleased) {
                // Partially watched relative to Release
                // User Requirement: If I finished S1, but S2 is out, keep me in 'show_returning' (waiting to start S2).
                // "if the user has only clicked on S1 ... keep this in show_returning"
                newStatus = 'show_returning';
            } else {
                // Caught Up (lastWatchedSeason >= totalReleased)
                // Check future
                if (meta?.next_episode_to_air?.air_date) {
                    const nextEp = meta.next_episode_to_air;
                    const nextDate = new Date(nextEp.air_date);

                    // Logic update for "Ongoing" status handling
                    if (nextDate > today) {
                        // Future episode exists.
                        // If it's in the SAME season we just "finished" (caught up to), it implies the season is ONGOING.
                        // User wants 'show_watching' for this state.
                        if (nextEp.season_number === lastWatchedSeason) {
                            newStatus = 'show_watching';
                        } else {
                            newStatus = 'show_returning';
                        }
                    } else {
                        // If next ep date is <= today (or just today), implies new content is out.
                        // And since user is marked "Caught Up" to PREVIOUS totalReleased, this implies mismatch or just-dropped.
                        // Usually 'releasedSeasons' filter handles this (would increment totalReleased if aired).
                        // So this block might be unreachable if releasedSeasons logic works perfectly, but as safety:
                        newStatus = 'show_watching';
                    }
                }
            }
        }

        // Update both Status and last_watched_season in DB/State
        // We assume last_watched_season is already updated in metadata by the caller (markSeasonWatched etc)
        // BE CAREFUL: updateStatus only updates status column. updateWatchlistItemMetadata updates metadata.
        // We should ensure both are synced.

        if (item.status !== newStatus) {
            await updateStatus(tmdbId, 'show', newStatus);
        }
        // Force refresh local state reference just in case?
        // setWatchlist triggers re-render.
    };

    const markSeasonWatched = async (tmdbId: number, seasonNumber: number) => {
        // 1. Update LOCAL State (Optimistic)
        // We must update both metadata (for consistency) AND the top-level last_watched_season property
        setWatchlist(prev => prev.map(item => {
            if (item.tmdb_id === tmdbId && item.type === 'show') {
                const newMeta = { ...(item.metadata || {}), last_watched_season: seasonNumber } as any;
                return { ...item, last_watched_season: seasonNumber, metadata: newMeta };
            }
            return item;
        }));

        // 2. Persist to DB
        // Update Metadata Column (legacy/backup)
        // await updateWatchlistItemMetadata(...) -> We skip calling this helper to avoid double state update, 
        // we'll do direct DB call or call a specialized helper that doesn't set state? 
        // Actually, let's just use updateWatchlistItemMetadata BUT we already updated state above. 
        // Calling it again is fine for React, but verify behavior.
        // Better to just DO the DB update manually here to be safe and clean.

        const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === 'show');
        const MetaWithUpdate = { ...(item?.metadata || {}), last_watched_season: seasonNumber };
        const prunned = pruneMetadata(MetaWithUpdate);

        if (user) {
            await supabase.from('watchlist').update({
                last_watched_season: seasonNumber,
                metadata: prunned
            }).eq('user_id', user.id).eq('tmdb_id', tmdbId);
        } else {
            // Local Storage Update
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            const updatedLocal = local.map((i: any) => (i.tmdb_id === tmdbId && i.type === 'show') ? { ...i, last_watched_season: seasonNumber, metadata: MetaWithUpdate } : i);
            localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
        }

        await recalculateShowStatus(tmdbId, seasonNumber);
    };

    const markSeasonUnwatched = async (tmdbId: number, seasonNumber: number) => {
        const newLastWatched = Math.max(0, seasonNumber - 1);

        // 1. Update LOCAL State
        setWatchlist(prev => prev.map(item => {
            if (item.tmdb_id === tmdbId && item.type === 'show') {
                const newMeta = { ...(item.metadata || {}), last_watched_season: newLastWatched } as any;
                return { ...item, last_watched_season: newLastWatched, metadata: newMeta };
            }
            return item;
        }));

        // 2. Persist
        const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === 'show');
        const MetaWithUpdate = { ...(item?.metadata || {}), last_watched_season: newLastWatched };
        const prunned = pruneMetadata(MetaWithUpdate);

        if (user) {
            await supabase.from('watchlist').update({
                last_watched_season: newLastWatched,
                metadata: prunned
            }).eq('user_id', user.id).eq('tmdb_id', tmdbId);
        } else {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            const updatedLocal = local.map((i: any) => (i.tmdb_id === tmdbId && i.type === 'show') ? { ...i, last_watched_season: newLastWatched, metadata: MetaWithUpdate } : i);
            localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
        }

        await recalculateShowStatus(tmdbId, newLastWatched);
    };

    const dismissFromUpcoming = async (tmdbId: number, type: 'movie' | 'show') => {
        const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === type);
        if (!item) return;
        const newMeta: any = { ...(item.metadata || {}), dismissed_from_upcoming: true };
        setWatchlist(prev => prev.map(i => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, metadata: newMeta } : i));
        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, metadata: newMeta } : i)));
            return;
        }
        await supabase.from('watchlist').update({ metadata: newMeta }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
    };

    const restoreToUpcoming = async (tmdbId: number, type: 'movie' | 'show') => {
        const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === type);
        if (!item) return;

        // Remove the flag or set to false
        const newMeta: any = { ...(item.metadata || {}), dismissed_from_upcoming: false };

        // Optimistic Update
        setWatchlist(prev => prev.map(i => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, metadata: newMeta } : i));

        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, metadata: newMeta } : i)));
            return;
        }
        await supabase.from('watchlist').update({ metadata: newMeta }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
    };

    const updateWatchlistItemMetadata = async (tmdbId: number, type: 'movie' | 'show', newMetadata: any) => {
        const pruned = pruneMetadata(newMetadata);
        setWatchlist(prev => prev.map(i => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, metadata: pruned } : i));
        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, metadata: pruned } : i)));
            return;
        }
        await supabase.from('watchlist').update({ metadata: pruned }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
    };

    const updateStatus = async (tmdbId: number, type: 'movie' | 'show', newStatus: WatchlistItem['status']) => {
        setWatchlist(prev => prev.map(item => (item.tmdb_id === tmdbId && item.type === type) ? { ...item, status: newStatus } : item));

        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, status: newStatus } : i)));
            return;
        }
        await supabase.from('watchlist').update({ status: newStatus }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
    };

    const refreshMetadata = async (tmdbId: number, type: 'movie' | 'show', overrideMetadata?: any) => {
        const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === type);
        if (!item) return;

        try {
            const { initialStatus, finalMetadata } = await getEnrichedMetadata(tmdbId, type, overrideMetadata || item.metadata, item.status);

            let statusToUpdate: WatchlistItem['status'] = initialStatus;

            await updateWatchlistItemMetadata(tmdbId, type, finalMetadata);
            if (item.status !== statusToUpdate) {
                await updateStatus(tmdbId, type, statusToUpdate);
            }
        } catch (err) {
            console.error(`Failed to refresh metadata for ${tmdbId}:`, err);
        }
    };

    return (
        <WatchlistContext.Provider value={{
            watchlist,
            addToWatchlist,
            removeFromWatchlist,
            markAsWatched,
            markAsUnwatched,
            moveToLibrary,
            isInWatchlist,
            loading,
            watchedSeasons: undefined as never, // Deprecated
            markSeasonWatched,
            markSeasonUnwatched,
            dismissFromUpcoming,
            restoreToUpcoming,
            updateWatchlistItemMetadata,
            updateStatus,
            refreshMetadata
        }}>
            {children}
        </WatchlistContext.Provider>
    );
}

export const useWatchlist = () => {
    const context = useContext(WatchlistContext);
    if (context === undefined) throw new Error('useWatchlist must be used within a WatchlistProvider');
    return context;
};
