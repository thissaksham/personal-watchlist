import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { Game } from '../../../types';

const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY;
const RAWG_BASE_URL = 'https://api.rawg.io/api';

export const useGameSearch = (query: string) => {
    return useQuery({
        queryKey: ['games', 'search', query],
        queryFn: async () => {
            if (!query) return [];
            // RAWG Search
            const { data } = await axios.get(`${RAWG_BASE_URL}/games`, {
                params: {
                    key: RAWG_API_KEY,
                    search: query,
                    page_size: 20,
                    exclude_additions: true,
                    ordering: '-added'
                }
            });
            return data.results.map((g: any) => transformRAWGGame(g));
        },
        enabled: !!query && !!RAWG_API_KEY
    });
};

export const useFranchiseCollection = (collectionId: number | undefined) => {
    // RAWG doesn't have a direct "collection" equivalent in the same way IGDB does for simple lists, 
    // but usually "Series" or "Franchises" are separate. 
    // For now, disabling this or leaving it as a placeholder since the UI uses it.
    // We can fetch a game series if we knew the ID, but RAWG IDs are different.
    return useQuery({
        queryKey: ['games', 'collection', collectionId],
        queryFn: async () => {
             // Placeholder: RAWG Collections are complex to map 1:1 without new logic.
             // We'll return empty for now to prevent crashes.
             return [];
        },
        enabled: false
    });
};

// Helper to transform RAWG data to our Game type
function transformRAWGGame(rawg: any): Game {
    return {
        id: `rawg-${rawg.id}`,
        rawg_id: rawg.id, // Direct mapping
        igdb_id: 0, // Deprecated default
        title: rawg.name,
        cover_url: rawg.background_image || null, // RAWG uses background_image as the main visual
        status: 'backlog', // Default for new found games
        release_date: rawg.released ? rawg.released.substring(0, 4) : 'TBA',
        rating: rawg.rating ? rawg.rating * 20 : 0, // RAWG is 0-5, converting to 0-100 scale
        genres: rawg.genres?.map((g: any) => g.name),
        platform: rawg.parent_platforms?.map((p: any) => p.platform.name) || []
    };
}
