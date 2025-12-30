import React, { createContext, useContext, useEffect, useState } from 'react';
import { useWatchlistData } from '../hooks/useWatchlistData';
import { useWatchlistMutations } from '../hooks/useWatchlistMutations';
import type { WatchlistItem, WatchStatus } from '../../../types';
import type { TMDBMedia } from '../../../lib/tmdb';

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
    updateStatus: (tmdbId: number, type: 'movie' | 'show', newStatus: WatchStatus) => Promise<void>;
    refreshMetadata: (tmdbId: number, type: 'movie' | 'show', overrideMetadata?: any) => Promise<void>;
    markAsDropped: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    restoreFromDropped: (tmdbId: number, type: 'movie' | 'show') => Promise<void>;
    refreshAllMetadata: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
    const { data: watchlist = [], isLoading } = useWatchlistData();
    const mutations = useWatchlistMutations();
    const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);

    const isInWatchlist = (tmdbId: number, type: 'movie' | 'show') => {
        return watchlist.some((item) => item.tmdb_id == tmdbId && item.type === type);
    };

    const refreshAllMetadata = async () => {
        setIsGlobalRefreshing(true);
        try {
            console.log(`Starting global refresh for ${watchlist.length} items...`);
            let count = 0;
            for (const item of watchlist) {
                if (!item.tmdb_id) continue;
                await mutations.refreshMetadata({ tmdbId: item.tmdb_id, type: item.type, overrideMetadata: item.metadata });
                count++;
            }
            console.log(`Global refresh complete. Processed ${count} items.`);
        } catch (error) {
            console.error("Global Refresh Failed:", error);
        } finally {
            setIsGlobalRefreshing(false);
        }
    };

    // --- SYSTEMIC HEALTH CHECK (Auto-Repair) ---
    useEffect(() => {
        if (!isLoading && watchlist.length > 0) {
            const timer = setTimeout(() => {
                performHealthCheck();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isLoading]); // Run once when loading finishes (technically whenever loading toggles, but harmless)

    const performHealthCheck = async () => {
        console.log('🏥 Performing Global Health Check...');
        const sickItems = watchlist.filter(item => {
            const meta = (item.metadata || {}) as any;
            if (item.type === 'show') {
                const hasNext = !!meta.next_episode_to_air;
                const hasLast = !!meta.last_episode_to_air;
                if (!hasNext && !hasLast) return true;
            }
            if (item.type === 'movie' && !meta.release_date) return true;
            return false;
        });

        if (sickItems.length === 0) {
            console.log('✅ Health Check Passed: Library integrity is good.');
            return;
        }

        console.log(`⚠️ Found ${sickItems.length} items requiring repair. Scheduling fixes...`);
        const chunkSize = 5;
        for (let i = 0; i < sickItems.length; i += chunkSize) {
            const chunk = sickItems.slice(i, i + chunkSize);
            await Promise.all(chunk.map(item => mutations.refreshMetadata({ tmdbId: item.tmdb_id, type: item.type })));
            if (i + chunkSize < sickItems.length) await new Promise(r => setTimeout(r, 1000));
        }
        console.log('🏁 Health Check & Repair Complete.');
    };

    return (
        <WatchlistContext.Provider value={{
            watchlist,
            loading: isLoading || isGlobalRefreshing,
            watchedSeasons: undefined as never,
            isInWatchlist,
            refreshAllMetadata,
            // Map mutation hook object to Context interface
            addToWatchlist: (media, type) => mutations.addToWatchlist({ media, type }),
            removeFromWatchlist: (tmdbId, type) => mutations.removeFromWatchlist({ tmdbId, type }),
            markAsWatched: (tmdbId, type) => mutations.markAsWatched({ tmdbId, type }),
            markAsUnwatched: (tmdbId, type) => mutations.markAsUnwatched({ tmdbId, type }),
            moveToLibrary: (tmdbId, type) => mutations.moveToLibrary({ tmdbId, type }),
            markSeasonWatched: (tmdbId, seasonNumber) => mutations.markSeasonWatched({ tmdbId, seasonNumber }),
            markSeasonUnwatched: (tmdbId, seasonNumber) => mutations.markSeasonUnwatched({ tmdbId, seasonNumber }),
            dismissFromUpcoming: (tmdbId, type) => mutations.dismissFromUpcoming({ tmdbId, type }),
            restoreToUpcoming: (tmdbId, type) => mutations.restoreToUpcoming({ tmdbId, type }),
            updateWatchlistItemMetadata: (tmdbId, type, newMetadata) => mutations.updateMetadata({ tmdbId, type, metadata: newMetadata }),
            updateStatus: (tmdbId, type, newStatus) => mutations.updateStatus({ tmdbId, type, status: newStatus }),
            refreshMetadata: (tmdbId, type, overrideMetadata) => mutations.refreshMetadata({ tmdbId, type, overrideMetadata }),
            markAsDropped: (tmdbId, type) => mutations.markAsDropped({ tmdbId, type }),
            restoreFromDropped: (tmdbId, type) => mutations.restoreFromDropped({ tmdbId, type }),
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
