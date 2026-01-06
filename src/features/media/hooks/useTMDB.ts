import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { tmdb } from '../../../lib/tmdb';
import { usePreferences } from '../../../context/PreferencesContext';

export function useTrending(type: 'movie' | 'tv' | 'all' = 'movie', timeWindow: 'day' | 'week' = 'week') {
    const { region } = usePreferences();

    return useQuery({
        queryKey: ['trending', type, timeWindow, region],
        queryFn: () => tmdb.getTrending(type, timeWindow, region),
    });
}

export function useSearch(query: string, type: 'movie' | 'tv' | 'multi' = 'multi') {
    const { region } = usePreferences();

    return useInfiniteQuery({
        queryKey: ['search', query, type, region],
        queryFn: ({ pageParam = 1 }) => tmdb.search(query, type, region, pageParam as number),
        initialPageParam: 1,
        getNextPageParam: (lastPage: any) => {
            if (!lastPage || !lastPage.total_pages || lastPage.page >= lastPage.total_pages) return undefined;
            return lastPage.page + 1;
        },
        enabled: !!query && query.length > 0,
        staleTime: 1000 * 60 * 10, // 10 minutes for searches
    });
}

export function useMediaDetails(id: number, type: 'movie' | 'tv') {
    const { region } = usePreferences();

    return useQuery({
        queryKey: ['media', type, id, region],
        queryFn: () => tmdb.getDetails(id, type, region),
        enabled: !!id,
        staleTime: 1000 * 60 * 60, // 1 hour for details
    });
}
