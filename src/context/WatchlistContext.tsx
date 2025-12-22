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
    status: 'watched' | 'unwatched' | 'movie_on_ott' | 'movie_coming_soon' | 'plan_to_watch' | 'dropped' | 'watching'; // Legacy status supported temporarily
    metadata?: TMDBMedia; // Include metadata in type definition
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
    watchedSeasons: Set<string>;
    markSeasonWatched: (tmdbId: number, seasonNumber: number) => Promise<void>;
    markSeasonUnwatched: (tmdbId: number, seasonNumber: number) => Promise<void>;
    dismissFromUpcoming: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    updateWatchlistItemMetadata: (tmdbId: number, type: 'movie' | 'show', newMetadata: any) => Promise<void>;
    updateStatus: (tmdbId: number, type: 'movie' | 'show', newStatus: WatchlistItem['status']) => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [watchedSeasons, setWatchedSeasons] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (user) {
            fetchWatchlist();
            fetchWatchedSeasons();
        } else {
            const localWl = JSON.parse(localStorage.getItem('watchlist') || '[]');
            setWatchlist(localWl);
            const localSeasons = JSON.parse(localStorage.getItem('watched_seasons') || '[]');
            setWatchedSeasons(new Set(localSeasons));
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

    const fetchWatchedSeasons = async () => {
        const { data } = await supabase.from('watched_seasons').select('*');
        if (data) {
            const loaded = new Set(data.map((row: any) => `${row.tmdb_id}-${row.season_number}`));
            setWatchedSeasons(loaded);
        }
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
            status: 'plan_to_watch' // Will be updated below
        };

        let initialStatus = 'unwatched'; // Default for TV Shows

        // 1. Enrichment (Details, Providers, Release Dates)
        // We do this BEFORE insert to ensure the correct "moved_to_library" flag
        let finalMetadata = { ...media };
        let movedToLibrary = true;

        try {
            const tmdbType = type === 'show' ? 'tv' : 'movie';
            const [details, releaseData] = await Promise.all([
                tmdb.getDetails(media.id, tmdbType),
                tmdbType === 'movie' ? tmdb.getReleaseDates(media.id) : Promise.resolve({ results: [] })
            ]);

            let digitalDate = null;
            let theatricalDate = null;
            let digitalNote = null;

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
                let dates = extractDates(TMDB_REGION);
                if (!dates?.hasData && results.length > 0) {
                    for (const res of results) {
                        const d = extractDates(res.iso_3166_1);
                        if (d?.hasData) { dates = d; break; }
                    }
                }
                if (dates) {
                    theatricalDate = dates.theatrical || null;
                    digitalDate = dates.digital || null;
                    digitalNote = dates.digitalNote || null;
                }
            }

            // ... (Variable Declaration Scope Issue correction)
            // Let's refactor slightly to ensure we capture the note variable properly.

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

            // Categorization Logic (The 3-Step Flow)
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

            if (tmdbType === 'movie') {
                const releaseDateStr = details.release_date;
                const releaseDateObj = releaseDateStr ? new Date(releaseDateStr) : null;

                // 1. Check Streaming/Renting in India
                const hasProvidersIN = allStreamingOrRental.length > 0;

                // 2. Check Future Digital Date in India
                // We derived 'digitalDate' above from IN release dates
                const hasFutureDigitalDateIN = digitalDate && new Date(digitalDate) > today;

                // 3. Check Global Availability if > 6 Months Old
                let isAvailableGlobally = false;
                if (releaseDateObj) {
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

                    if (releaseDateObj < sixMonthsAgo) {
                        // Check if ANY region has providers
                        const allProviders = details['watch/providers']?.results || {};
                        // Iterate all regions
                        for (const region in allProviders) {
                            const p = allProviders[region];
                            const hasP = (p.flatrate || []).length > 0 || (p.rent || []).length > 0 || (p.buy || []).length > 0;
                            if (hasP) {
                                isAvailableGlobally = true;
                                break;
                            }
                        }
                    }
                }

                if (hasProvidersIN) {
                    // Rule 1: Streaming/Rent in India -> Unwatched
                    movedToLibrary = true;
                    initialStatus = 'unwatched';
                } else if (hasFutureDigitalDateIN) {
                    // Rule 2: Future Digital Date in India -> OTT
                    movedToLibrary = false;
                    initialStatus = 'movie_on_ott';
                } else if (isAvailableGlobally) {
                    // Rule 3 (Extra): Not in India, but > 6 months old and available elsewhere -> Unwatched (Library)
                    movedToLibrary = true;
                    initialStatus = 'unwatched';
                } else if (releaseDateObj && releaseDateObj < new Date(new Date().setFullYear(new Date().getFullYear() - 1))) {
                    // Rule 4 (Legacy): Older than 1 year and not streaming anywhere -> Unwatched (Library)
                    // Assumption: It's available on disk/local media if it's this old.
                    movedToLibrary = true;
                    initialStatus = 'unwatched';
                } else {
                    // Rule 5 (Default): Everything else -> Coming Soon
                    movedToLibrary = false;
                    initialStatus = 'movie_coming_soon';
                }
            } else {
                movedToLibrary = true;
                initialStatus = 'unwatched';
                const nextEp = details.next_episode_to_air;
                if (nextEp && nextEp.air_date) {
                    if (new Date(nextEp.air_date) > today) movedToLibrary = false;
                    // For now, shows are simple: either unwatched or watched. We don't distinguish "Coming Soon" for shows heavily yet.
                }
            }

            const { credits, production_companies, images, videos, reviews, ...leanDetails } = details as any;
            finalMetadata = {
                ...media,
                ...leanDetails,
                tvmaze_runtime: tvmazeRuntime,
                digital_release_date: digitalDate,
                digital_release_note: digitalNote,
                theatrical_release_date: theatricalDate,
                moved_to_library: movedToLibrary
            };
        } catch (err) {
            console.error("Enrichment failed", err);
        }



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
            if (error.code === '23503') { // Foreign Key Violation
                alert('Session Error: Your user ID not found in database. Please Sign Out and Log In again.');
            } else {
                alert('Error adding to watchlist: ' + error.message);
            }
        } else if (insertedData) {
            setWatchlist((prev) => [insertedData, ...prev]);
        }
    };

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
        // We do NOT store credits, production_companies, languages, etc.
        // We ALSO exclude top-level columns (title, poster, vote_average, id) to avoid duplication (Schema Optimization)
        const {
            // These we want to keep
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
            poster_path: meta.poster_path, // KEEP THIS
            backdrop_path, overview,
            vote_average: meta.vote_average, // KEEP THIS
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

    const removeFromWatchlist = async (tmdbId: number, type: 'movie' | 'show') => {
        const dbType = type as 'movie' | 'show';
        setWatchlist((prev) => prev.filter((item) => !(item.tmdb_id == tmdbId && item.type === dbType)));

        if (type === 'show') {
            setWatchedSeasons(prev => {
                const next = new Set(prev);
                Array.from(next).forEach(key => { if (key.startsWith(`${tmdbId}-`)) next.delete(key); });
                if (!user) localStorage.setItem('watched_seasons', JSON.stringify(Array.from(next)));
                return next;
            });
        }

        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.filter((item: any) => !(item.tmdb_id == tmdbId && item.type === dbType))));
            if (type === 'show') {
                const seasons = JSON.parse(localStorage.getItem('watched_seasons') || '[]');
                localStorage.setItem('watched_seasons', JSON.stringify(seasons.filter((s: string) => !s.startsWith(`${tmdbId}-`))));
            }
            return;
        }

        // Database cleanup
        await supabase.from('watchlist').delete().eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', dbType);

        if (type === 'show') {
            await supabase.from('watched_seasons').delete().eq('user_id', user.id).eq('tmdb_id', tmdbId);
        }
    };

    const markAsWatched = async (tmdbId: number, type: 'movie' | 'show') => {
        const dbType = type as 'movie' | 'show';

        if (type === 'show') {
            const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === 'show');
            let seasons = item?.metadata?.seasons;
            if (!seasons) {
                try {
                    const details = await tmdb.getDetails(tmdbId, 'tv');
                    seasons = details.seasons || [];
                } catch (e) { seasons = []; }
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const released = (seasons || []).filter((s: any) => s.season_number > 0 && s.air_date && new Date(s.air_date) <= today);
            const nums = released.map((s: any) => s.season_number);

            setWatchedSeasons(prev => {
                const next = new Set(prev);
                nums.forEach((n: number) => next.add(`${tmdbId}-${n}`));
                if (!user) localStorage.setItem('watched_seasons', JSON.stringify(Array.from(next)));
                return next;
            });

            if (user) {
                const updates = nums.map((n: number) => ({ user_id: user.id, tmdb_id: tmdbId, season_number: n }));
                if (updates.length > 0) await supabase.from('watched_seasons').upsert(updates, { onConflict: 'user_id, tmdb_id, season_number' });
            }
        }

        setWatchlist((prev) => prev.map(item => (item.tmdb_id === tmdbId && item.type === dbType) ? { ...item, status: 'watched' } : item));
        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === dbType) ? { ...i, status: 'watched' } : i)));
            return;
        }

        await supabase.from('watchlist').update({ status: 'watched' }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', dbType);
    };


    const moveToLibrary = async (tmdbId: number, type: 'movie' | 'show') => {
        // This is explicitly for moving from "Upcoming" -> "Library"
        const dbType = type as 'movie' | 'show';

        // Update local state
        setWatchlist((prev) => prev.map(item => {
            if (item.tmdb_id === tmdbId && item.type === dbType) {
                // Also ensure the moved_to_library meta flag is true for legacy support
                const newMeta = { ...(item.metadata || {}), moved_to_library: true } as TMDBMedia;
                return { ...item, status: 'unwatched', metadata: newMeta };
            }
            return item;
        }));

        if (!user) {
            // Local storage update...
            return;
        }

        // We update specific metadata fields too, just to be safe with the legacy flags
        // Fetch current item to construct new metadata? No, just partial update for metadata is risky without merge.
        // Actually, supabase update replaces the object.
        // It's safer to just update status if we rely on status.
        // But we promised to set moved_to_library = true.

        // Let's do it properly via fetching current item from local state
        const currentItem = watchlist.find(i => i.tmdb_id === tmdbId && i.type === dbType);
        if (currentItem) {
            const newMeta = { ...(currentItem.metadata || {}), moved_to_library: true };
            const pruned = pruneMetadata(newMeta);
            await supabase.from('watchlist').update({ status: 'unwatched', metadata: pruned }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', dbType);
        }
    };

    const markAsUnwatched = async (tmdbId: number, type: 'movie' | 'show') => {
        const dbType = type as 'movie' | 'show';
        if (type === 'show') {
            setWatchedSeasons(prev => {
                const next = new Set(prev);
                Array.from(next).forEach(k => { if (k.startsWith(`${tmdbId}-`)) next.delete(k); });
                if (!user) localStorage.setItem('watched_seasons', JSON.stringify(Array.from(next)));
                return next;
            });
            if (user) await supabase.from('watched_seasons').delete().match({ user_id: user.id, tmdb_id: tmdbId });
        }

        setWatchlist((prev) => prev.map(item => (item.tmdb_id === tmdbId && item.type === dbType) ? { ...item, status: 'unwatched' } : item));
        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === dbType) ? { ...i, status: 'unwatched' } : i)));
            return;
        }
        await supabase.from('watchlist').update({ status: 'unwatched' }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', dbType);
    };

    const isInWatchlist = (tmdbId: number, type: 'movie' | 'show') => {
        return watchlist.some((item) => item.tmdb_id == tmdbId && item.type === type);
    };

    const markSeasonWatched = async (tmdbId: number, seasonNumber: number) => {
        const key = `${tmdbId}-${seasonNumber}`;
        setWatchedSeasons(prev => {
            const next = new Set(prev);
            next.add(key);
            if (!user) localStorage.setItem('watched_seasons', JSON.stringify(Array.from(next)));
            return next;
        });
        if (user) await supabase.from('watched_seasons').upsert({ user_id: user.id, tmdb_id: tmdbId, season_number: seasonNumber });
    };

    const markSeasonUnwatched = async (tmdbId: number, seasonNumber: number) => {
        const key = `${tmdbId}-${seasonNumber}`;
        setWatchedSeasons(prev => {
            const next = new Set(prev);
            next.delete(key);
            if (!user) localStorage.setItem('watched_seasons', JSON.stringify(Array.from(next)));
            return next;
        });
        if (user) await supabase.from('watched_seasons').delete().match({ user_id: user.id, tmdb_id: tmdbId, season_number: seasonNumber });
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
        const dbType = type;
        setWatchlist(prev => prev.map(item => (item.tmdb_id === tmdbId && item.type === dbType) ? { ...item, status: newStatus } : item));

        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === dbType) ? { ...i, status: newStatus } : i)));
            return;
        }
        await supabase.from('watchlist').update({ status: newStatus }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', dbType);
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
            watchedSeasons,
            markSeasonWatched,
            markSeasonUnwatched,
            dismissFromUpcoming,
            updateWatchlistItemMetadata,
            updateStatus
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
