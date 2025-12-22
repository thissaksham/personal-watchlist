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
    status: 'watched' | 'plan_to_watch' | 'dropped' | 'watching';
    metadata?: TMDBMedia; // Include metadata in type definition
}

interface WatchlistContextType {
    watchlist: WatchlistItem[];
    addToWatchlist: (media: TMDBMedia, type: 'movie' | 'show') => Promise<void>;
    removeFromWatchlist: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    markAsWatched: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    markAsWatching: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    markAsUnwatched: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    isInWatchlist: (tmdbId: number, type: 'movie' | 'show') => boolean;
    loading: boolean;
    watchedSeasons: Set<string>;
    markSeasonWatched: (tmdbId: number, seasonNumber: number) => Promise<void>;
    markSeasonUnwatched: (tmdbId: number, seasonNumber: number) => Promise<void>;
    dismissFromUpcoming: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    updateWatchlistItemMetadata: (tmdbId: number, type: 'movie' | 'show', newMetadata: any) => Promise<void>;
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
            status: 'plan_to_watch'
        };

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
            if (tmdbType === 'movie') {
                const results = releaseData?.results || [];
                const extractDates = (regionCode: string) => {
                    const regionData = results.find((r: any) => r.iso_3166_1 === regionCode);
                    if (!regionData?.release_dates) return null;
                    const theatrical = regionData.release_dates.find((d: any) => d.type === 3);
                    const digital = regionData.release_dates.find((d: any) => d.type === 4);
                    return { theatrical: theatrical?.release_date, digital: digital?.release_date, hasData: !!(theatrical || digital) };
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
                // Step 1: If streaming or rental now -> MOVIES (Library)
                movedToLibrary = allStreamingOrRental.length > 0;
            } else {
                movedToLibrary = true;
                const nextEp = details.next_episode_to_air;
                if (nextEp && nextEp.air_date) {
                    if (new Date(nextEp.air_date) > today) movedToLibrary = false;
                }
            }

            const { credits, production_companies, images, videos, reviews, ...leanDetails } = details as any;
            finalMetadata = {
                ...media,
                ...leanDetails,
                tvmaze_runtime: tvmazeRuntime,
                digital_release_date: digitalDate,
                theatrical_release_date: theatricalDate,
                moved_to_library: movedToLibrary
            };
        } catch (err) {
            console.error("Enrichment failed", err);
        }

        const finalItem = { ...newItemBase, metadata: finalMetadata };

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
            alert('Error adding to watchlist: ' + error.message);
        } else if (insertedData) {
            setWatchlist((prev) => [insertedData, ...prev]);
        }
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

    const markAsWatching = async (tmdbId: number, type: 'movie' | 'show') => {
        const dbType = type as 'movie' | 'show';
        setWatchlist((prev) => prev.map(item => (item.tmdb_id === tmdbId && item.type === dbType) ? { ...item, status: 'watching' } : item));
        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === dbType) ? { ...i, status: 'watching' } : i)));
            return;
        }
        await supabase.from('watchlist').update({ status: 'watching' }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', dbType);
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

        setWatchlist((prev) => prev.map(item => (item.tmdb_id === tmdbId && item.type === dbType) ? { ...item, status: 'plan_to_watch' } : item));
        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === dbType) ? { ...i, status: 'plan_to_watch' } : i)));
            return;
        }
        await supabase.from('watchlist').update({ status: 'plan_to_watch' }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', dbType);
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
        setWatchlist(prev => prev.map(i => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, metadata: newMetadata } : i));
        if (!user) {
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            localStorage.setItem('watchlist', JSON.stringify(local.map((i: any) => (i.tmdb_id === tmdbId && i.type === type) ? { ...i, metadata: newMetadata } : i)));
            return;
        }
        await supabase.from('watchlist').update({ metadata: newMetadata }).eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
    };

    return (
        <WatchlistContext.Provider value={{
            watchlist,
            addToWatchlist,
            removeFromWatchlist,
            markAsWatched,
            markAsWatching,
            markAsUnwatched,
            isInWatchlist,
            loading,
            watchedSeasons,
            markSeasonWatched,
            markSeasonUnwatched,
            dismissFromUpcoming,
            updateWatchlistItemMetadata
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
