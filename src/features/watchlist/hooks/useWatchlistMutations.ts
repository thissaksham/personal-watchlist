import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/context/AuthContext';
import { usePreferences } from '../../../context/PreferencesContext';
import { pruneMetadata, getEnrichedMetadata } from '../utils/watchlistUtils';
import { determineShowStatus } from '../utils/watchlistLogic';
import { tmdb, type TMDBMedia } from '../../../lib/tmdb';
import type { WatchlistItem, WatchStatus } from '../../../types';

export function useWatchlistMutations() {
    const { user } = useAuth();
    const { region } = usePreferences();
    const queryClient = useQueryClient();
    const queryKey = ['watchlist', user?.id || 'local'];

    const getList = () => queryClient.getQueryData<WatchlistItem[]>(queryKey) || [];

    // Generic Update Helper (Optimistic + DB)
    const mutateItem = async (
        tmdbId: number,
        type: 'movie' | 'show',
        updates: Partial<WatchlistItem>,
        onOptimistic: (item: WatchlistItem) => WatchlistItem
    ) => {
        // Optimistic
        const previousList = getList();
        queryClient.setQueryData(queryKey, (old: WatchlistItem[] = []) =>
            old.map(item => (item.tmdb_id === tmdbId && item.type === type) ? onOptimistic(item) : item)
        );

        try {
            if (!user) {
                // Local
                const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
                const updated = local.map((item: any) =>
                    (item.tmdb_id === tmdbId && item.type === type) ? { ...item, ...updates } : item
                );
                localStorage.setItem('watchlist', JSON.stringify(updated));
            } else {
                // Supabase
                const { error } = await supabase
                    .from('watchlist')
                    .update(updates)
                    .eq('user_id', user.id)
                    .eq('tmdb_id', tmdbId)
                    .eq('type', type);
                if (error) throw error;
            }
        } catch (err) {
            console.error("Mutation failed, reverting...", err);
            queryClient.setQueryData(queryKey, previousList);
            throw err;
        }
    };

    // --- RECALCULATE STATUS LOGIC ---
    const recalculateShowStatus = async (tmdbId: number, lastWatchedSeason: number, currentMeta: any) => {
        const newStatus = determineShowStatus(currentMeta, lastWatchedSeason);
        await mutateItem(tmdbId, 'show', { status: newStatus }, (item) => ({ ...item, status: newStatus }));
    };

    // --- MUTATIONS ---

    const addToWatchlist = useMutation({
        onMutate: async ({ media, type }: { media: TMDBMedia; type: 'movie' | 'show' }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousList = getList();
            const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}-${Math.random()}`;
            const newItemBase: WatchlistItem = {
                id: tempId,
                user_id: user?.id || 'local-user',
                tmdb_id: media.id,
                type: type,
                title: media.title || media.name || 'Unknown',
                poster_path: media.poster_path,
                vote_average: media.vote_average,
                status: type === 'movie' ? 'movie_unwatched' : 'show_new'
            };
            queryClient.setQueryData(queryKey, [newItemBase, ...previousList]);
            return { previousList, tempId };
        },
        mutationFn: async ({ media, type }: { media: TMDBMedia; type: 'movie' | 'show' }) => {
            const { initialStatus, finalMetadata } = await getEnrichedMetadata(media.id, type, region, media);
            const prunedMetadata = pruneMetadata(finalMetadata, region);

            const itemData: any = {
                tmdb_id: media.id,
                type: type,
                title: media.title || media.name || 'Unknown',
                poster_path: media.poster_path,
                vote_average: media.vote_average,
                status: initialStatus,
                metadata: prunedMetadata,
                user_id: user?.id
            };

            if (!user) {
                const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
                const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`;
                const finalItem = { ...itemData, id: tempId, user_id: 'local-user' };
                const cleaned = local.filter((item: any) => !(item.tmdb_id == media.id && item.type === type));
                const updated = [finalItem, ...cleaned];
                localStorage.setItem('watchlist', JSON.stringify(updated));
                return finalItem;
            } else {
                const { data, error } = await supabase.from('watchlist').insert(itemData).select().single();
                if (error) throw error;
                return data;
            }
        },
        onSuccess: (newItem, _vars, context) => {
            queryClient.setQueryData(queryKey, (old: WatchlistItem[] | undefined) => {
                if (!old) return [newItem];
                return old.map(item => item.id === context?.tempId ? newItem : item);
            });
        },
        onError: (_err, _vars, context) => {
            if (context?.previousList) queryClient.setQueryData(queryKey, context.previousList);
        }
    });

    const removeFromWatchlist = useMutation({
        onMutate: async ({ tmdbId, type }: { tmdbId: number; type: 'movie' | 'show' }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousList = getList();
            queryClient.setQueryData(queryKey, previousList.filter(i => !(i.tmdb_id == tmdbId && i.type === type)));
            return { previousList };
        },
        mutationFn: async ({ tmdbId, type }: { tmdbId: number; type: 'movie' | 'show' }) => {
            if (!user) {
                const local = JSON.parse(localStorage.getItem('watchlist') || '[]');
                const updated = local.filter((item: any) => !(item.tmdb_id == tmdbId && item.type === type));
                localStorage.setItem('watchlist', JSON.stringify(updated));
                return;
            }
            const { error } = await supabase.from('watchlist').delete().eq('user_id', user.id).eq('tmdb_id', tmdbId).eq('type', type);
            if (error) throw error;
        },
        onError: (_err, _vars, context) => {
            if (context?.previousList) queryClient.setQueryData(queryKey, context.previousList);
        }
    });


    // --- STATUS & METADATA MUTATIONS ---

    const updateStatus = useMutation({
        mutationFn: async ({ tmdbId, type, status }: { tmdbId: number; type: 'movie' | 'show', status: WatchStatus }) => {
            await mutateItem(tmdbId, type, { status }, (item) => ({ ...item, status }));
        }
    });

    const updateMetadata = useMutation({
        mutationFn: async ({ tmdbId, type, metadata }: { tmdbId: number; type: 'movie' | 'show', metadata: any }) => {
            const pruned = pruneMetadata(metadata, region);
            await mutateItem(tmdbId, type, { metadata: pruned }, (item) => ({ ...item, metadata: pruned }));
        }
    });

    const markAsWatched = useMutation({
        mutationFn: async ({ tmdbId, type }: { tmdbId: number; type: 'movie' | 'show' }) => {
            if (type === 'show') {
                const list = getList();
                const item = list.find(i => i.tmdb_id === tmdbId && i.type === 'show');
                let seasons = item?.metadata?.seasons;

                if (!seasons) {
                    try {
                        const details = await tmdb.getDetails(tmdbId, 'tv');
                        seasons = details.seasons || [];
                    } catch (e) { seasons = []; }
                }

                const todayStr = new Date().toISOString().split('T')[0];
                const released = (seasons || []).filter((s: any) => s.season_number > 0 && s.air_date && s.air_date <= todayStr);
                const maxSeason = released.length > 0 ? released[released.length - 1].season_number : 0;

                const newMeta = { ...(item?.metadata || {}), last_watched_season: maxSeason, seasons };
                const pruned = pruneMetadata(newMeta, region);

                // Update Metadata & Last Watched Season combined
                await mutateItem(tmdbId, 'show', { last_watched_season: maxSeason, metadata: pruned }, (i) => ({ ...i, last_watched_season: maxSeason, metadata: pruned }));

                // Recalculate Logic
                await recalculateShowStatus(tmdbId, maxSeason, pruned);

            } else {
                await mutateItem(tmdbId, 'movie', { status: 'movie_watched' }, (i) => ({ ...i, status: 'movie_watched' }));
            }
        }
    });

    const markAsUnwatched = useMutation({
        mutationFn: async ({ tmdbId, type }: { tmdbId: number; type: 'movie' | 'show' }) => {
            if (type === 'show') {
                // Reset season progress
                const list = getList();
                const item = list.find(i => i.tmdb_id === tmdbId && i.type === 'show');
                const newMeta = { ...(item?.metadata || {}), last_watched_season: 0 };
                const pruned = pruneMetadata(newMeta, region);

                await mutateItem(tmdbId, 'show', { last_watched_season: 0, metadata: pruned }, (i) => ({ ...i, last_watched_season: 0, metadata: pruned }));
                await recalculateShowStatus(tmdbId, 0, pruned);
            } else {
                await mutateItem(tmdbId, 'movie', { status: 'movie_unwatched' }, (i) => ({ ...i, status: 'movie_unwatched' }));
            }
        }
    });

    const markSeasonWatched = useMutation({
        mutationFn: async ({ tmdbId, seasonNumber }: { tmdbId: number; seasonNumber: number }) => {
            const list = getList();
            const item = list.find(i => i.tmdb_id === tmdbId && i.type === 'show');
            const newMeta = { ...(item?.metadata || {}), last_watched_season: seasonNumber };
            const pruned = pruneMetadata(newMeta, region);

            await mutateItem(tmdbId, 'show', { last_watched_season: seasonNumber, metadata: pruned }, (i) => ({ ...i, last_watched_season: seasonNumber, metadata: pruned }));
            await recalculateShowStatus(tmdbId, seasonNumber, pruned);
        }
    });

    const markSeasonUnwatched = useMutation({
        mutationFn: async ({ tmdbId, seasonNumber }: { tmdbId: number; seasonNumber: number }) => {
            const newLastWatched = Math.max(0, seasonNumber - 1);
            const list = getList();
            const item = list.find(i => i.tmdb_id === tmdbId && i.type === 'show');
            const newMeta = { ...(item?.metadata || {}), last_watched_season: newLastWatched };
            const pruned = pruneMetadata(newMeta, region);

            await mutateItem(tmdbId, 'show', { last_watched_season: newLastWatched, metadata: pruned }, (i) => ({ ...i, last_watched_season: newLastWatched, metadata: pruned }));
            await recalculateShowStatus(tmdbId, newLastWatched, pruned);
        }
    });

    const moveToLibrary = useMutation({
        mutationFn: async ({ tmdbId, type }: { tmdbId: number; type: 'movie' | 'show' }) => {
            const targetStatus = type === 'movie' ? 'movie_unwatched' : 'show_new';
            const list = getList();
            const item = list.find(i => i.tmdb_id === tmdbId && i.type === type);
            const newMeta = { ...(item?.metadata || {}), moved_to_library: true };
            const pruned = pruneMetadata(newMeta, region);

            await mutateItem(tmdbId, type, { status: targetStatus, metadata: pruned }, (i) => ({ ...i, status: targetStatus, metadata: pruned }));
        }
    });

    const markAsDropped = useMutation({
        mutationFn: async ({ tmdbId, type }: { tmdbId: number; type: 'movie' | 'show' }) => {
            const status = type === 'movie' ? 'movie_dropped' : 'show_dropped';
            await mutateItem(tmdbId, type, { status }, (i) => ({ ...i, status }));
        }
    });

    const restoreFromDropped = useMutation({
        mutationFn: async ({ tmdbId, type }: { tmdbId: number; type: 'movie' | 'show' }) => {
            if (type === 'movie') {
                await mutateItem(tmdbId, 'movie', { status: 'movie_unwatched' }, (i) => ({ ...i, status: 'movie_unwatched' }));
            } else {
                const list = getList();
                const item = list.find(i => i.tmdb_id === tmdbId && i.type === 'show');
                const lastWatched = item?.last_watched_season || 0;
                await recalculateShowStatus(tmdbId, lastWatched, item?.metadata);
            }
        }
    });

    const dismissFromUpcoming = useMutation({
        mutationFn: async ({ tmdbId, type }: { tmdbId: number; type: 'movie' | 'show' }) => {
            const list = getList();
            const item = list.find(i => i.tmdb_id === tmdbId && i.type === type);
            const newMeta = { ...(item?.metadata || {}), dismissed_from_upcoming: true };
            const pruned = pruneMetadata(newMeta, region);
            await mutateItem(tmdbId, type, { metadata: pruned }, (i) => ({ ...i, metadata: pruned }));
        }
    });

    const restoreToUpcoming = useMutation({
        mutationFn: async ({ tmdbId, type }: { tmdbId: number; type: 'movie' | 'show' }) => {
            const list = getList();
            const item = list.find(i => i.tmdb_id === tmdbId && i.type === type);
            const newMeta = { ...(item?.metadata || {}), dismissed_from_upcoming: false };
            const pruned = pruneMetadata(newMeta, region);
            await mutateItem(tmdbId, type, { metadata: pruned }, (i) => ({ ...i, metadata: pruned }));
        }
    });

    const refreshMetadata = useMutation({
        mutationFn: async ({ tmdbId, type, overrideMetadata }: { tmdbId: number; type: 'movie' | 'show'; overrideMetadata?: any }) => {
            const list = getList();
            const item = list.find(i => i.tmdb_id === tmdbId && i.type === 'show');
            if (!item) return;

            const { initialStatus, finalMetadata } = await getEnrichedMetadata(tmdbId, type, region, overrideMetadata || item.metadata, item.status);
            const finalWithTimestamp = { ...finalMetadata, last_updated_at: Date.now() };
            const pruned = pruneMetadata(finalWithTimestamp, region);

            // Prepare updates
            const updates: Partial<WatchlistItem> = { metadata: pruned };
            if (item.status !== initialStatus) {
                updates.status = initialStatus;
            }

            await mutateItem(tmdbId, type, updates, (i) => ({ ...i, ...updates }));
        }
    });

    return {
        addToWatchlist: addToWatchlist.mutateAsync,
        removeFromWatchlist: removeFromWatchlist.mutateAsync,
        updateStatus: updateStatus.mutateAsync,
        updateMetadata: updateMetadata.mutateAsync,
        markAsWatched: markAsWatched.mutateAsync,
        markAsUnwatched: markAsUnwatched.mutateAsync,
        markSeasonWatched: markSeasonWatched.mutateAsync,
        markSeasonUnwatched: markSeasonUnwatched.mutateAsync,
        moveToLibrary: moveToLibrary.mutateAsync,
        markAsDropped: markAsDropped.mutateAsync,
        restoreFromDropped: restoreFromDropped.mutateAsync,
        dismissFromUpcoming: dismissFromUpcoming.mutateAsync,
        restoreToUpcoming: restoreToUpcoming.mutateAsync,
        refreshMetadata: refreshMetadata.mutateAsync
    };
}
