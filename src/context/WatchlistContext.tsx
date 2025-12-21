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
    status: 'watched' | 'plan_to_watch' | 'dropped';
    metadata?: TMDBMedia; // Include metadata in type definition
}

interface WatchlistContextType {
    watchlist: WatchlistItem[];
    addToWatchlist: (media: TMDBMedia, type: 'movie' | 'show') => Promise<void>;
    removeFromWatchlist: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    markAsWatched: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    markAsUnwatched: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    isInWatchlist: (tmdbId: number, type: 'movie' | 'show') => boolean;
    loading: boolean;
    watchedSeasons: Set<string>;
    markSeasonWatched: (tmdbId: number, seasonNumber: number) => Promise<void>;
    markSeasonUnwatched: (tmdbId: number, seasonNumber: number) => Promise<void>;
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

        if (!user) {
            try {
                const localWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
                const initialLength = localWatchlist.length;

                // Use loose equality (==) for IDs to handle string/number mismatch in localStorage
                const updatedLocal = localWatchlist.filter((item: any) => {
                    const idMatch = item.tmdb_id == tmdbId;
                    const typeMatch = item.type === dbType;
                    return !(idMatch && typeMatch);
                });

                if (updatedLocal.length === initialLength) {
                    console.warn(`[Watchlist] Remove failed? Item not found: ${tmdbId} ${dbType}`);
                    // window.alert(`Debug: Item ${tmdbId} not found in local storage to remove.`);
                }

                localStorage.setItem('watchlist', JSON.stringify(updatedLocal));
                setWatchlist(updatedLocal);
                console.log(`[Watchlist] Removed. New length: ${updatedLocal.length}`);
            } catch (e) {
                console.error("Local storage remove error", e);
                alert("Error removing item: " + e);
            }
            return;
        }

        const { error } = await supabase
            .from('watchlist')
            .delete()
            .match({ user_id: user.id, tmdb_id: tmdbId, type: dbType });

        if (error) {
            console.error('Error removing from watchlist:', error);
            alert('Error removing: ' + error.message);
        } else {
            setWatchlist((prev) => prev.filter((item) => !(item.tmdb_id === tmdbId && item.type === dbType)));
        }
    };

    const markAsWatched = async (tmdbId: number, type: 'movie' | 'show') => {
        const dbType = type as 'movie' | 'show';

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

        const { error } = await supabase
            .from('watchlist')
            .update({ status: 'watched' })
            .match({ user_id: user.id, tmdb_id: tmdbId, type: dbType });

        if (error) {
            console.error('Error marking as watched:', error);
            // Revert on error (simple fetch to reset)
            fetchWatchlist();
        }
    };

    const markAsUnwatched = async (tmdbId: number, type: 'movie' | 'show') => {
        const dbType = type as 'movie' | 'show';

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

        const { error } = await supabase
            .from('watchlist')
            .update({ status: 'plan_to_watch' })
            .match({ user_id: user.id, tmdb_id: tmdbId, type: dbType });

        if (error) {
            console.error('Error marking as unwatched:', error);
            fetchWatchlist();
        }
    };

    const isInWatchlist = (tmdbId: number, type: 'movie' | 'show') => {
        return watchlist.some((item) => item.tmdb_id === tmdbId && item.type === type);
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

    return (
        <WatchlistContext.Provider value={{
            watchlist,
            addToWatchlist,
            removeFromWatchlist,
            markAsWatched,
            markAsUnwatched,
            isInWatchlist,
            loading,
            // New Exports
            watchedSeasons,
            markSeasonWatched,
            markSeasonUnwatched
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
