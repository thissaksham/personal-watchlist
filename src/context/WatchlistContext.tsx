import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { tmdb, type TMDBMedia } from '../lib/tmdb';

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
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchWatchlist();
        } else {
            console.log('[WatchlistContext] loading from local storage');
            const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
            setWatchlist(local);
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

    const addToWatchlist = async (media: TMDBMedia, type: 'movie' | 'show') => {
        // Safe ID generation
        const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}-${Math.random()}`;

        const newItem: any = {
            id: tempId,
            user_id: user?.id || 'local-user',
            tmdb_id: media.id,
            type: type,
            title: media.title || media.name || 'Unknown',
            poster_path: media.poster_path,
            vote_average: media.vote_average,
            status: 'plan_to_watch',
            metadata: media
        };

        if (!user) {
            try {
                const localWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');

                // Prevent duplicates by removing existing entry for this item first (Upsert style)
                // Use loose checking for ID to match potential string IDs in storage
                const cleanedList = localWatchlist.filter((item: any) => !(item.tmdb_id == media.id && item.type === type));

                const updatedLocal = [newItem, ...cleanedList];
                localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
                setWatchlist(updatedLocal);
                console.log(`[Watchlist] Added ${newItem.title} to local storage. Total: ${updatedLocal.length}`);
            } catch (err) {
                console.error("Local storage add error", err);
                alert("Failed to save to local storage: " + err);
            }
            return;
        }

        // 2. Insert immediately into Supabase (Fast)
        const { data: insertedData, error } = await supabase.from('watchlist').insert(newItem).select().single();

        if (error) {
            alert('Error adding to watchlist: ' + error.message);
            return;
        } else if (insertedData) {
            // Update local state immediately
            setWatchlist((prev) => [insertedData, ...prev]);
        }

        // 3. Background Enrichment (Slow - fetching OTT & Runtime)
        // We do not await this, so the UI is unblocked
        (async () => {
            try {
                const tmdbType = type === 'show' ? 'tv' : 'movie';

                // A. Fetch TMDB Details (Providers, External IDs)
                const details = await tmdb.getDetails(media.id, tmdbType);

                // B. Fetch TVMaze Data (Runtime)
                let tvmazeRuntime = null;
                if (tmdbType === 'tv' && details.external_ids?.imdb_id) {
                    try {
                        const tvmRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${details.external_ids.imdb_id}`);
                        if (tvmRes.ok) {
                            const tvmData = await tvmRes.json();
                            if (tvmData.averageRuntime) {
                                tvmazeRuntime = tvmData.averageRuntime;
                            }
                        }
                    } catch (e) {
                        console.warn("Failed to fetch TVMaze data", e);
                    }
                }

                // C. PRUNE METADATA: Remove heavy fields like credits, production_companies, etc.
                // We only need providers, runtime info, and external_ids.
                const { credits, production_companies, images, videos, reviews, ...leanDetails } = details as any;

                const optimizedMetadata = {
                    ...media,
                    ...leanDetails,
                    tvmaze_runtime: tvmazeRuntime
                };

                // 4. Update the record with optimized metadata
                const { error: updateError } = await supabase
                    .from('watchlist')
                    .update({ metadata: optimizedMetadata })
                    .match({ id: insertedData!.id });

                if (updateError) {
                    console.error("Failed to update metadata in background", updateError);
                } else {
                    // Update local state again with full data (silently)
                    setWatchlist((prev) => prev.map(item =>
                        item.id === insertedData!.id ? { ...item, metadata: optimizedMetadata } : item
                    ));
                }

            } catch (err) {
                console.error("Background data enrichment failed", err);
            }
        })();
    };

    const removeFromWatchlist = async (tmdbId: number, type: 'movie' | 'show') => {
        console.log(`[Watchlist] Removing ${tmdbId} (${type})`);
        const dbType = type as 'movie' | 'show';

        // 1. Optimistic Update: Remove from Watchlist Array
        setWatchlist((prev) => prev.filter((item) => !(item.tmdb_id == tmdbId && item.type === dbType)));

        // 2. Optimistic Update: Clear Watched Seasons (if it's a show)
        if (type === 'show') {
            setWatchedSeasons(prev => {
                const next = new Set(prev);
                // Remove all keys starting with "ID-"
                Array.from(next).forEach(key => {
                    if (key.startsWith(`${tmdbId}-`)) {
                        next.delete(key);
                    }
                });
                if (!user) localStorage.setItem('watched_seasons', JSON.stringify(Array.from(next)));
                return next;
            });
        }

        if (!user) {
            // ... (Local Storage logic - update to remove watched_seasons too if needed)
            try {
                const localWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
                const updatedLocal = localWatchlist.filter((item: any) => !(item.tmdb_id == tmdbId && item.type === dbType));
                localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
                setWatchlist(updatedLocal);

                // Also clear watched seasons from local storage if show
                if (type === 'show') {
                    const localSeasons = JSON.parse(localStorage.getItem('watched_seasons') || '[]');
                    const userPrefix = `${tmdbId}-`;
                    const updatedSeasons = localSeasons.filter((s: string) => !s.startsWith(userPrefix));
                    localStorage.setItem('watched_seasons', JSON.stringify(updatedSeasons));
                }
            } catch (e) {
                console.error("Local storage remove error", e);
            }
            return;
        }

        // 3. Database: Delete from 'watchlist'
        // Use explicit .eq() for better control and type safety
        const { error: wlError, count } = await supabase
            .from('watchlist')
            .delete({ count: 'exact' })
            .eq('user_id', user.id)
            .eq('tmdb_id', Number(tmdbId))
            .eq('type', dbType);

        if (wlError) {
            console.error('Error removing from watchlist:', wlError);
            fetchWatchlist(); // Revert on error
        } else {
            // Verify deletion
            if (count === 0) {
                console.warn(`[Watchlist] DB Delete returned 0 rows for Movie/Show! ID: ${tmdbId}, Type: ${dbType}`);
                // Fallback: Try with string ID if number failed (rare edge case but happens if legacy data)
                if (typeof tmdbId !== 'number') {
                    await supabase.from('watchlist').delete().match({ user_id: user.id, tmdb_id: String(tmdbId), type: dbType });
                }
            }
        }

        // 4. Database: Delete from 'watched_seasons' (if show)
        if (type === 'show') {
            const { error: wsError } = await supabase
                .from('watched_seasons')
                .delete()
                .match({ user_id: user.id, tmdb_id: tmdbId });

            if (wsError) console.error('Error removing watched seasons:', wsError);
        }
    };



    const markAsWatched = async (tmdbId: number, type: 'movie' | 'show') => {
        const dbType = type as 'movie' | 'show';

        if (type === 'show') {
            // Smart Mark for Shows: Mark all RELEASED seasons
            const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === 'show');
            let seasons: any[] = [];

            if (item?.metadata?.seasons) {
                seasons = item.metadata.seasons;
            } else {
                try {
                    const details = await tmdb.getDetails(tmdbId, 'tv');
                    seasons = details.seasons || [];
                } catch (e) {
                    console.error("Failed to fetch details for smart mark", e);
                }
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const releasedSeasons = seasons.filter((s: any) => {
                if (s.season_number === 0) return false; // Skip specials usually
                if (!s.air_date) return false; // No date = assume unreleased or unknown
                return new Date(s.air_date) <= today;
            });

            const seasonNumbers = releasedSeasons.map((s: any) => s.season_number);

            // Optimistic Updates for Seasons
            setWatchedSeasons(prev => {
                const next = new Set(prev);
                seasonNumbers.forEach((num: number) => next.add(`${tmdbId}-${num}`));
                if (!user) localStorage.setItem('watched_seasons', JSON.stringify(Array.from(next)));
                return next;
            });

            if (user) {
                // Batch insert/upsert for seasons
                const updates = seasonNumbers.map((num: number) => ({
                    user_id: user.id,
                    tmdb_id: tmdbId,
                    season_number: num
                }));

                if (updates.length > 0) {
                    const { error: upsertError } = await supabase
                        .from('watched_seasons')
                        .upsert(updates, { onConflict: 'user_id, tmdb_id, season_number' });

                    if (upsertError) {
                        console.error('Error saving watched seasons:', upsertError);
                    }
                }
            }
        }

        if (!user) {
            const localWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
            const updatedLocal = localWatchlist.map((item: any) =>
                (item.tmdb_id === tmdbId && item.type === dbType)
                    ? { ...item, status: 'watched' }
                    : item
            );
            localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
            setWatchlist(updatedLocal);
            return;
        }

        // Optimistic Update
        setWatchlist((prev) => prev.map(item =>
            (item.tmdb_id === tmdbId && item.type === dbType)
                ? { ...item, status: 'watched' }
                : item
        ));

        const { error, count } = await supabase
            .from('watchlist')
            .update({ status: 'watched' }, { count: 'exact' })
            .eq('user_id', user.id)
            .eq('tmdb_id', Number(tmdbId))
            .eq('type', dbType);

        if (error) {
            console.error('Error marking as watched:', error);
            // Revert on error (simple fetch to reset)
            fetchWatchlist();
        } else if (count === 0) {
            console.warn(`[Watchlist] Mark Watched updated 0 rows. ID: ${tmdbId}`);
        }
    };

    const markAsWatching = async (tmdbId: number, type: 'movie' | 'show') => {
        const dbType = type as 'movie' | 'show';

        if (!user) {
            const localWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
            const updatedLocal = localWatchlist.map((item: any) =>
                (item.tmdb_id === tmdbId && item.type === dbType)
                    ? { ...item, status: 'watching' }
                    : item
            );
            localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
            setWatchlist(updatedLocal);
            return;
        }

        // Optimistic Update
        setWatchlist((prev) => prev.map(item =>
            (item.tmdb_id === tmdbId && item.type === dbType)
                ? { ...item, status: 'watching' }
                : item
        ));

        const { error, count } = await supabase
            .from('watchlist')
            .update({ status: 'watching' }, { count: 'exact' })
            .eq('user_id', user.id)
            .eq('tmdb_id', Number(tmdbId))
            .eq('type', dbType);

        if (error) {
            console.error('Error marking as watching:', error);
            fetchWatchlist();
        } else if (count === 0) {
            console.warn(`[Watchlist] Mark Watching updated 0 rows. ID: ${tmdbId}`);
        }
    };

    const markAsUnwatched = async (tmdbId: number, type: 'movie' | 'show') => {
        const dbType = type as 'movie' | 'show';

        if (type === 'show') {
            // Deep Unwatch for Shows: Remove ALL seasons
            setWatchedSeasons(prev => {
                const next = new Set(prev);
                // Remove all keys starting with tmdbId-
                for (const key of next) {
                    if (key.startsWith(`${tmdbId}-`)) {
                        next.delete(key);
                    }
                }
                if (!user) localStorage.setItem('watched_seasons', JSON.stringify(Array.from(next)));
                return next;
            });

            if (user) {
                // Delete all season records for this show
                await supabase.from('watched_seasons').delete().match({
                    user_id: user.id,
                    tmdb_id: tmdbId
                });
            }
        }

        if (!user) {
            const localWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
            const updatedLocal = localWatchlist.map((item: any) =>
                (item.tmdb_id === tmdbId && item.type === dbType)
                    ? { ...item, status: 'plan_to_watch' }
                    : item
            );
            localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
            setWatchlist(updatedLocal);
            return;
        }

        // Optimistic Update
        setWatchlist((prev) => prev.map(item =>
            (item.tmdb_id === tmdbId && item.type === dbType)
                ? { ...item, status: 'plan_to_watch' }
                : item
        ));

        const { error, count } = await supabase
            .from('watchlist')
            .update({ status: 'plan_to_watch' }, { count: 'exact' })
            .eq('user_id', user.id)
            .eq('tmdb_id', Number(tmdbId))
            .eq('type', dbType);

        if (error) {
            console.error('Error marking as unwatched:', error);
            fetchWatchlist();
        } else if (count === 0) {
            console.warn(`[Watchlist] Mark Unwatched updated 0 rows. ID: ${tmdbId}`);
        }
    };

    const isInWatchlist = (tmdbId: number, type: 'movie' | 'show') => {
        // Use loose equality to match potential string IDs from local storage or params
        const match = watchlist.find((item) => item.tmdb_id == tmdbId && item.type === type);
        if (match) {
            console.log(`[Watchlist] Found match for ${tmdbId} (${type}):`, match); // Verbose log ENABLED
            return true;
        }
        return false;
    };

    // --- Season Tracking Logic ---

    // State to store watched seasons: Map of "tmdbId-seasonNumber" -> boolean
    const [watchedSeasons, setWatchedSeasons] = useState<Set<string>>(new Set());

    // Load watched seasons on init
    useEffect(() => {
        if (!user) {
            const local = JSON.parse(localStorage.getItem('watched_seasons') || '[]');
            setWatchedSeasons(new Set(local));
        } else {
            // Fetch from Supabase
            (async () => {
                const { data } = await supabase.from('watched_seasons').select('*');
                if (data) {
                    const loaded = new Set(data.map((row: any) => `${row.tmdb_id}-${row.season_number}`));
                    setWatchedSeasons(loaded);
                }
            })();
        }
    }, [user]);

    const markSeasonWatched = async (tmdbId: number, seasonNumber: number) => {
        const key = `${tmdbId}-${seasonNumber}`;

        // Optimistic Update
        setWatchedSeasons(prev => {
            const next = new Set(prev);
            next.add(key);
            if (!user) {
                localStorage.setItem('watched_seasons', JSON.stringify(Array.from(next)));
            }
            return next;
        });

        if (user) {
            await supabase.from('watched_seasons').upsert({
                user_id: user.id,
                tmdb_id: tmdbId,
                season_number: seasonNumber
            });
        }
    };

    const markSeasonUnwatched = async (tmdbId: number, seasonNumber: number) => {
        const key = `${tmdbId}-${seasonNumber}`;

        // Optimistic Update
        setWatchedSeasons(prev => {
            const next = new Set(prev);
            next.delete(key);
            if (!user) {
                localStorage.setItem('watched_seasons', JSON.stringify(Array.from(next)));
            }
            return next;
        });

        if (user) {
            await supabase.from('watched_seasons').delete().match({
                user_id: user.id,
                tmdb_id: tmdbId,
                season_number: seasonNumber
            });
        }
    };

    // --- Dismiss Logic ---
    const dismissFromUpcoming = async (tmdbId: number, type: 'movie' | 'show') => {
        const item = watchlist.find(i => i.tmdb_id === tmdbId && i.type === type);
        if (!item) return;

        const newMeta: any = { ...(item.metadata || {}), dismissed_from_upcoming: true };

        // Optimistic Update
        setWatchlist(prev => prev.map(i =>
            (i.tmdb_id === tmdbId && i.type === type)
                ? { ...i, metadata: newMeta }
                : i
        ));
        console.log(`[Watchlist] Dismissing ${tmdbId} from upcoming`);

        if (!user) {
            const localWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
            const updatedLocal = localWatchlist.map((i: any) =>
                (i.tmdb_id === tmdbId && i.type === type)
                    ? { ...i, metadata: newMeta }
                    : i
            );
            localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
            return;
        }

        const { error, count } = await supabase
            .from('watchlist')
            .update({ metadata: newMeta }, { count: 'exact' })
            .eq('user_id', user.id)
            .eq('tmdb_id', Number(tmdbId))
            .eq('type', type);

        if (error) {
            console.error('Error dismissing from upcoming:', error);
            fetchWatchlist(); // Revert
        } else if (count === 0) {
            console.warn(`[Watchlist] Dismiss (Upcoming) updated 0 rows. ID: ${tmdbId}`);
            // Fallback
            if (typeof tmdbId !== 'number') {
                await supabase.from('watchlist').update({ metadata: newMeta }).match({ user_id: user.id, tmdb_id: String(tmdbId), type: type });
            }
        }
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
            // New Exports
            watchedSeasons,
            markSeasonWatched,

            markSeasonUnwatched,
            dismissFromUpcoming
        }}>
            {children}
        </WatchlistContext.Provider>
    );
}

export const useWatchlist = () => {
    const context = useContext(WatchlistContext);
    if (context === undefined) {
        throw new Error('useWatchlist must be used within a WatchlistProvider');
    }
    return context;
};
