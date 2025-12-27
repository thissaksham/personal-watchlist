import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { tmdb, type TMDBMedia } from '../lib/tmdb';
import { isReleased, isFuture } from '../lib/dateUtils';
import { usePreferences } from './PreferencesContext';

export interface WatchlistItem {
    id: string; // database uuid
    tmdb_id: number;
    type: 'movie' | 'show';
    title: string;
    poster_path: string | null;
    vote_average: number;
    status: 'movie_watched' | 'movie_unwatched' | 'movie_dropped' | 'movie_on_ott' | 'movie_coming_soon' | 'show_finished' | 'show_ongoing' | 'show_watched' | 'show_watching' | 'show_returning' | 'show_new' | 'show_dropped';
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
    markAsDropped: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;

    restoreFromDropped: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    refreshAllMetadata: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { region } = usePreferences();
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

    const getEnrichedMetadata = async (tmdbId: number, type: 'movie' | 'show', existingMetadata?: any, currentStatus?: WatchlistItem['status']) => {
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
            let inDates = extractDates(region);
            if (inDates?.digital) {
                indianDigitalDate = inDates.digital;
                indianDigitalNote = inDates.digitalNote;
            }
            if (inDates?.theatrical) {
                theatricalDate = inDates.theatrical;
            }

            // Global Theatrical Fallback (Find EARLIEST Date)
            // If no local date, find the earliest release (Premiere, Limited, or Theatrical) anywhere in the world.
            // This prevents showing a 2026 date for a movie premiering in 2025 just because a random country list was checked last.
            if (!theatricalDate && results.length > 0) {
                let earliestDate = null;
                for (const res of results) {
                    if (!res.release_dates || !Array.isArray(res.release_dates)) continue;

                    for (const d of res.release_dates) {
                        // Check for Limited (2), Theatrical (3), or Digital (4)
                        // Exclude Premiere (1) as requested by user (Festival dates vs Wide Release)
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

        let initialStatus: WatchlistItem['status'] = type === 'movie' ? 'movie_unwatched' : 'show_new';
        let movedToLibrary = true;

        if (tmdbType === 'movie') {
            /*
             * MOVIE CATEGORIZATION LOGIC (Source of Truth)
             *
             * 1. Add New Movie Check (No currentStatus)
             *    - Is Streaming Now? -> Library (movie_unwatched)
             *    - Has Future Digital Date / Manual Override? -> OTT (movie_on_ott)
             *    - Is Old / Released Globally? -> Library (movie_unwatched)
             *    - Else -> Coming Soon (movie_coming_soon)
             *
             * 2. Refresh Logic Check (Has currentStatus)
             *    - "Gatekeeper Rule": Only upgrade to 'On OTT' if currently 'movie_coming_soon'.
             *    - Streaming/Old/Global found?
             *      - If currentStatus == 'movie_coming_soon' -> Upgrade to OTT.
             *      - If currentStatus == 'movie_unwatched' -> Stay in Library.
             */
            // If we found a theatrical/premiere date earlier than the main release_date, use that.
            // This ensures a 2025 Premiere is respected even if the "Release Date" is set to 2026.
            let releaseDateStr = details.release_date;
            if (theatricalDate && (!releaseDateStr || theatricalDate < releaseDateStr)) {
                releaseDateStr = theatricalDate;
            }
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

            if (hasProvidersIN && (!releaseDateObj || releaseDateObj <= today)) {
                // Step 1: Streaming in India (AND Released)
                if (!currentStatus) {
                    // ADD LOGIC: Streaming -> Library (Unwatched)
                    movedToLibrary = true;
                    initialStatus = 'movie_unwatched';
                } else if (currentStatus === 'movie_coming_soon') {
                    // REFRESH LOGIC: Coming Soon -> On OTT
                    movedToLibrary = false;
                    initialStatus = 'movie_on_ott';
                } else {
                    // REFRESH LOGIC: Library/Others -> Stay Put
                    movedToLibrary = true;
                    initialStatus = currentStatus === 'movie_watched' ? 'movie_watched' : 'movie_unwatched';
                }
            } else if (hasProvidersIN || hasFutureIndianDigitalDate || hasManualOverride) {
                // Step 2: Upcoming Digital in India or Manual Override OR Future Streaming
                // Note: We include hasProvidersIN here because if it failed Step 1 (due to Future Date), it falls here.
                if (!currentStatus || currentStatus === 'movie_coming_soon' || hasManualOverride || hasProvidersIN) {
                    movedToLibrary = false;
                    initialStatus = 'movie_on_ott';
                } else {
                    movedToLibrary = true;
                    initialStatus = 'movie_unwatched';
                }

            } else if (isAvailableGlobally) {
                // Step 3: Available Globally + 6 months old
                if (!currentStatus) {
                    // ADD LOGIC: Old -> Library
                    movedToLibrary = true;
                    initialStatus = 'movie_unwatched';
                } else if (currentStatus === 'movie_coming_soon') {
                    // REFRESH LOGIC: Coming Soon -> On OTT
                    movedToLibrary = false;
                    initialStatus = 'movie_on_ott';
                } else {
                    // REFRESH LOGIC: Library -> Stay Library
                    movedToLibrary = true;
                    initialStatus = 'movie_unwatched';
                }
            } else if (releaseDateObj && releaseDateObj < new Date(new Date().setFullYear(new Date().getFullYear() - 1))) {
                // Step 4: Older than 1 year fallback
                if (!currentStatus) {
                    // ADD LOGIC: Old -> Library
                    movedToLibrary = true;
                    initialStatus = 'movie_unwatched';
                } else if (currentStatus === 'movie_coming_soon') {
                    // REFRESH LOGIC: Coming Soon -> On OTT
                    movedToLibrary = false;
                    initialStatus = 'movie_on_ott';
                } else {
                    // REFRESH LOGIC: Library -> Stay Library
                    movedToLibrary = true;
                    initialStatus = 'movie_unwatched';
                }
            } else {
                // Step 5: Default Coming Soon
                movedToLibrary = false;
                initialStatus = 'movie_coming_soon';
            }

            // Scenario 3 Protection: Sticky On OTT
            if (currentStatus === 'movie_on_ott' && initialStatus === 'movie_unwatched') {
                initialStatus = 'movie_on_ott';
                movedToLibrary = false;
            }
            // Watched status remains watched
            if (currentStatus === 'movie_watched') {
                initialStatus = 'movie_watched';
                movedToLibrary = true;
            }
        } else {
            /*
             * TV SHOW STATUS LOGIC (Source of Truth)
             *
             * 1. Check Content Availability
             *    - No Aired Episodes? -> show_new (Upcoming)
             *
             * 2. Check User Progress (last_watched_season)
             *    - not started? -> show_ongoing / show_finished (Library: To Watch)
             *    - started? -> Partition 3
             *
             * 3. Started Watching Logic (Partition 3)
             *    - Behind? (Released > Watched) -> show_watching (Library: Watching)
             *    - Caught Up?
             *      - Next Ep in specific verified future date?
             *          - Same Season? -> show_watching (Weekly)
             *          - Next Season? -> show_returning (Upcoming)
             *      - Future Season Announced? -> show_returning (Upcoming)
             *      - Else -> show_watched (Library: Watched)
             *
             * Note: show_returning items appear in Upcoming BUT also count as 'Watched' in Library filter.
             */
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
            status: type === 'movie' ? 'movie_unwatched' : 'show_new'
        };

        // Optimistic Update: Add to state immediately so UI responds instantly
        setWatchlist((prev) => [newItemBase, ...prev]);

        // Proceed with enrichment in the background
        const { initialStatus, finalMetadata } = await getEnrichedMetadata(media.id, type, media);
        const prunedMetadata = pruneMetadata(finalMetadata);
        const finalItem = { ...newItemBase, status: initialStatus, metadata: prunedMetadata };

        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            const cleaned = local.filter((item: any) => !(item.tmdb_id == media.id && item.type === type));
            const updated = [finalItem, ...cleaned];
            localStorage.setItem('watchlist', JSON.stringify(updated));
            // Update state with final enriched data (it replaces the optimistic one because of the same tmdb_id check elsewhere usually, 
            // but here we just update the whole list)
            setWatchlist(updated);
            return;
        }

        const { data: insertedData, error } = await supabase.from('watchlist').insert(finalItem).select().single();
        if (error) {
            console.error('Watchlist Insert Error:', error);
            // Revert optimistic update on error
            setWatchlist((prev) => prev.filter(i => i.id !== tempId));
            if (error.code === '23503') {
                alert('Session Error: Please Sign Out and Log In again.');
            } else {
                alert('Error adding to watchlist: ' + error.message);
            }
        } else if (insertedData) {
            // Replace optimistic item with real DB item
            setWatchlist((prev) => prev.map(item => item.id === tempId ? insertedData : item));
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

    const moveToLibrary = async (tmdbId: number, type: 'movie' | 'show') => {
        const targetStatus = type === 'movie' ? 'movie_unwatched' : 'show_new';

        setWatchlist((prev) => prev.map(item => {
            if (item.tmdb_id === tmdbId && item.type === type) {
                const newMeta = { ...(item.metadata || {}), moved_to_library: true } as TMDBMedia;
                return { ...item, status: targetStatus, metadata: newMeta };
            }
            return item;
        }));

        if (!user) return;

        const currentItem = watchlist.find(i => i.tmdb_id === tmdbId && i.type === type);
        if (currentItem) {
            const newMeta = { ...(currentItem.metadata || {}), moved_to_library: true };
            const pruned = pruneMetadata(newMeta);
            await supabase.from('watchlist').update({ status: targetStatus, metadata: pruned }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
        }
    };

    const isInWatchlist = (tmdbId: number, type: 'movie' | 'show') => {
        return watchlist.some((item) => item.tmdb_id == tmdbId && item.type === type);
    };

    // --- HELPERS (Database Updates - Defined BEFORE usage) ---

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

    // --- LOGIC ---

    const recalculateShowStatus = async (tmdbId: number, lastWatchedSeason: number, overrideMetadata?: any) => {
        const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === 'show');
        if (!item) return;

        const meta = overrideMetadata || item.metadata;

        // 1. Data Validation: Ensure seasons exist
        const seasons = meta?.seasons || [];

        // 2. Filter released seasons using robust date check
        // Using common logic: if air_date is valid and <= today
        const releasedSeasons = seasons.filter((s: any) =>
            s.season_number > 0 && isReleased(s.air_date)
        );
        const totalReleased = releasedSeasons.length;

        let newStatus: WatchlistItem['status'] = 'show_ongoing'; // Default Safe State

        // 3. Status State Machine
        if (totalReleased === 0) {
            // No released seasons? Check if episodes exist at all.
            // If no aired episodes -> 'show_new' (Projected)
            // If episodes exist but none matched filter? -> 'show_ongoing' (maybe specials?)
            if (!meta?.last_episode_to_air) {
                newStatus = 'show_new';
            } else {
                newStatus = 'show_ongoing';
            }
        } else if (lastWatchedSeason === 0) {
            // Not Started
            // Check implicit status from TMDB
            const isEnded = meta?.status === 'Ended' || meta?.status === 'Canceled';
            newStatus = isEnded ? 'show_finished' : 'show_ongoing';
        } else {
            // Started Watching
            if (lastWatchedSeason < totalReleased) {
                // User is behind the latest release
                newStatus = 'show_watching';
            } else {
                // Caught Up (User has watched everything currently released)
                let isFutureConfirmed = false;

                // Check "Next Episode" anchor
                if (meta?.next_episode_to_air?.air_date) {
                    if (isFuture(meta.next_episode_to_air.air_date)) {
                        isFutureConfirmed = true;
                        if (meta.next_episode_to_air.season_number === lastWatchedSeason) {
                            newStatus = 'show_watching'; // Mid-season break
                        } else {
                            newStatus = 'show_returning'; // Between seasons
                        }
                    }
                }

                // Fallback: Check for future seasons in explicit array
                if (!isFutureConfirmed) {
                    const hasFutureSeason = seasons.some((s: any) =>
                        s.season_number > lastWatchedSeason &&
                        isFuture(s.air_date)
                    );

                    if (hasFutureSeason) {
                        newStatus = 'show_returning';
                    } else {
                        // Truly caught up with no future content known
                        newStatus = 'show_watched';
                    }
                }
            }
        }

        // 4. Update both Status and last_watched_season in DB/State (Only if changed)
        if (item.status !== newStatus) {
            console.log(`State Transition [${item.title}]: ${item.status} -> ${newStatus}`);
            await updateStatus(tmdbId, 'show', newStatus);
        }
    };

    // --- ACTIONS (Depend on Helpers and Logic) ---

    // Moved from above to allow usage of updateWatchlistItemMetadata
    const markAsWatched = async (tmdbId: number, type: 'movie' | 'show') => {
        let newStatus: WatchlistItem['status'] = 'movie_watched';

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
            const todayStr = new Date().toISOString().split('T')[0];
            const released = (seasons || []).filter((s: any) => s.season_number > 0 && s.air_date && s.air_date <= todayStr);
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

    const markAsUnwatched = async (tmdbId: number, type: 'movie' | 'show') => {
        if (type === 'show') {
            await updateWatchlistItemMetadata(tmdbId, 'show', { ...((watchlist.find(i => i.tmdb_id === tmdbId)?.metadata) || {}), last_watched_season: 0 });

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

        setWatchlist((prev) => prev.map(item => (item.tmdb_id === tmdbId && item.type === type) ? { ...item, status: 'movie_unwatched' } : item));
        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, status: 'movie_unwatched' } : i)));
            return;
        }
        await supabase.from('watchlist').update({ status: 'movie_unwatched' }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
    };

    const markAsDropped = async (tmdbId: number, type: 'movie' | 'show') => {
        // User requested 'show_dropped' and 'movie_dropped' specifically.
        const specificStatus = type === 'movie' ? 'movie_dropped' : 'show_dropped';

        setWatchlist((prev) => prev.map(item => (item.tmdb_id === tmdbId && item.type === type) ? { ...item, status: specificStatus as any } : item));

        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, status: specificStatus } : i)));
            return;
        }

        await supabase.from('watchlist').update({ status: specificStatus }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
    };

    const restoreFromDropped = async (tmdbId: number, type: 'movie' | 'show') => {
        const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === type);
        if (!item) return;

        if (type === 'movie') {
            await updateStatus(tmdbId, 'movie', 'movie_unwatched');
        } else {
            // Show
            const lastWatched = item.last_watched_season || 0;
            // Recalculate based on preserved progress
            await recalculateShowStatus(tmdbId, lastWatched);
        }
    };

    const markSeasonWatched = async (tmdbId: number, seasonNumber: number) => {
        setWatchlist(prev => prev.map(item => {
            if (item.tmdb_id === tmdbId && item.type === 'show') {
                const newMeta = { ...(item.metadata || {}), last_watched_season: seasonNumber } as any;
                return { ...item, last_watched_season: seasonNumber, metadata: newMeta };
            }
            return item;
        }));

        const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === 'show');
        const MetaWithUpdate = { ...(item?.metadata || {}), last_watched_season: seasonNumber };
        const prunned = pruneMetadata(MetaWithUpdate);

        if (user) {
            await supabase.from('watchlist').update({
                last_watched_season: seasonNumber,
                metadata: prunned
            }).eq('user_id', user.id).eq('tmdb_id', tmdbId);
        } else {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            const updatedLocal = local.map((i: any) => (i.tmdb_id === tmdbId && i.type === 'show') ? { ...i, last_watched_season: seasonNumber, metadata: MetaWithUpdate } : i);
            localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
        }

        await recalculateShowStatus(tmdbId, seasonNumber);
    };

    const markSeasonUnwatched = async (tmdbId: number, seasonNumber: number) => {
        const newLastWatched = Math.max(0, seasonNumber - 1);

        setWatchlist(prev => prev.map(item => {
            if (item.tmdb_id === tmdbId && item.type === 'show') {
                const newMeta = { ...(item.metadata || {}), last_watched_season: newLastWatched } as any;
                return { ...item, last_watched_season: newLastWatched, metadata: newMeta };
            }
            return item;
        }));

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

    const refreshMetadata = async (tmdbId: number, type: 'movie' | 'show', overrideMetadata?: any) => {
        const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === type);
        if (!item) return;

        try {
            const { initialStatus, finalMetadata } = await getEnrichedMetadata(tmdbId, type, overrideMetadata || item.metadata, item.status);

            let statusToUpdate: WatchlistItem['status'] = initialStatus;

            const finalWithTimestamp = { ...finalMetadata, last_updated_at: Date.now() };
            await updateWatchlistItemMetadata(tmdbId, type, finalWithTimestamp);
            if (item.status !== statusToUpdate) {
                await updateStatus(tmdbId, type, statusToUpdate);
            }
        } catch (err) {
            console.error(`Failed to refresh metadata for ${tmdbId}:`, err);
        }
    };



    const refreshAllMetadata = async () => {
        setLoading(true);
        try {
            // Process sequentially to be nice to API limits (though we have a good rate limit handling in tmdb.ts)
            // But let's do it in chunks or simple sequence to avoid blocking UI too hard.
            console.log(`Starting global refresh for ${watchlist.length} items...`);
            let count = 0;
            for (const item of watchlist) {
                // Skip if no TMDB ID (local/broken)
                if (!item.tmdb_id) continue;
                await refreshMetadata(item.tmdb_id, item.type, item.metadata);
                count++;
                // Small delay to breath? verify tmdb.ts handles it. tmdb.ts has no specific queue, so sequence is safer.
            }
            console.log(`Global refresh complete. Processed ${count} items.`);
        } catch (error) {
            console.error("Global Refresh Failed:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- SYSTEMIC HEALTH CHECK (Auto-Repair) ---
    useEffect(() => {
        if (!loading && watchlist.length > 0) {
            const timer = setTimeout(() => {
                performHealthCheck();
            }, 2000); // 2s delay after load to let UI settle
            return () => clearTimeout(timer);
        }
    }, [loading]); // Run once when loading finishes

    const performHealthCheck = async () => {
        console.log('🏥 Performing Global Health Check...');
        const sickItems = watchlist.filter(item => {
            const meta = (item.metadata || {}) as any;

            // Criteria 1: TV Shows missing ANY episode anchors (Critical for sorting/status)
            if (item.type === 'show') {
                const hasNext = !!meta.next_episode_to_air;
                const hasLast = !!meta.last_episode_to_air;
                if (!hasNext && !hasLast) return true; // Completely lost show
            }

            // Criteria 2: Movies missing release date (rare but possible)
            if (item.type === 'movie' && !meta.release_date) return true;

            // Criteria 3: "Ghost" Items
            return false;
        });

        if (sickItems.length === 0) {
            console.log('✅ Health Check Passed: Library integrity is good.');
            return;
        }

        console.log(`⚠️ Found ${sickItems.length} items requiring repair. Scheduling fixes...`);

        // Process in batches of 5 to respect API limits but move fast
        const chunkSize = 5;
        for (let i = 0; i < sickItems.length; i += chunkSize) {
            const chunk = sickItems.slice(i, i + chunkSize);
            await Promise.all(chunk.map(item => refreshMetadata(item.tmdb_id, item.type)));
            // Small breathing room between chunks
            if (i + chunkSize < sickItems.length) await new Promise(r => setTimeout(r, 1000));
        }
        console.log('🏁 Health Check & Repair Complete.');
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
            markAsDropped,
            restoreFromDropped,
            dismissFromUpcoming,
            restoreToUpcoming,
            updateWatchlistItemMetadata,
            updateStatus,
            refreshMetadata,
            refreshAllMetadata
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
