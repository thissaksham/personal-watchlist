import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/context/AuthContext';
import type { WatchlistItem } from '../../../types';

export function useWatchlistData() {
    const { user } = useAuth();

    return useQuery<WatchlistItem[]>({
        queryKey: ['watchlist', user?.id || 'local'],
        queryFn: async () => {
            if (!user) {
                if (typeof window === 'undefined') return [];
                const local = localStorage.getItem('watchlist');
                return local ? JSON.parse(local) : [];
            }

            const { data, error } = await supabase
                .from('watchlist')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        // Refetch when window regains focus (good for syncing)
        refetchOnWindowFocus: true,
        // Sync local storage modifications if needed? 
        // React Query doesn't listen to localstorage events automatically. 
        // But for this app, mutations happen in-app mostly.
    });
}
