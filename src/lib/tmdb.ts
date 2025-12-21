const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
    console.error("Missing TMDB API Key! Check .env");
}

// Logic to determine Auth type:
// V4 Read Access Tokens are long JWTs (usually start with eyJ)
// V3 API Keys are shorter hex strings (~32 chars)
const isBearerToken = TMDB_API_KEY && TMDB_API_KEY.length > 60;

console.log(`[TMDB] Initializing. Key Present: ${!!TMDB_API_KEY}, Length: ${TMDB_API_KEY?.length}, Mode: ${isBearerToken ? 'Bearer' : 'API Key'}`);

const getHeaders = () => {
    const headers: Record<string, string> = {
        accept: 'application/json',
    };
    if (isBearerToken) {
        headers.Authorization = `Bearer ${TMDB_API_KEY}`;
    }
    return headers;
};

// Helper for fetching
async function fetchTMDB(endpoint: string, params: Record<string, string> = {}) {
    const queryParams: any = {
        language: 'en-US',
        ...params,
    };

    // If it's NOT a bearer token, we must use query param
    if (!isBearerToken && TMDB_API_KEY) {
        queryParams.api_key = TMDB_API_KEY;
    }

    const query = new URLSearchParams(queryParams).toString();
    const url = `${BASE_URL}${endpoint}?${query}`;
    console.log(`[TMDB] Fetching: ${url}`);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
        const res = await fetch(url, {
            headers: getHeaders(),
            signal: controller.signal
        });
        clearTimeout(id);

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            // Log the full error for debugging
            console.error('[TMDB] Request Failed:', res.status, res.statusText, errBody);
            throw new Error(`TMDB Error: ${res.status} ${res.statusText} - ${errBody.status_message || ''}`);
        }

        return res.json();
    } catch (error: any) {
        clearTimeout(id);
        console.error('[TMDB] Network/Fetch Error:', error);
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out for: ${url}`);
        }
        throw error;
    }
}

export interface TMDBMedia {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
    overview: string;
    release_date?: string;
    first_air_date?: string;
    media_type?: 'movie' | 'tv';
    runtime?: number;
    episode_run_time?: number[];
    number_of_episodes?: number;
    number_of_seasons?: number;
    last_episode_to_air?: {
        runtime: number;
    };
    external_ids?: {
        imdb_id?: string;
    };
    tvmaze_runtime?: number;
    status?: string;
    'watch/providers'?: any;
    countdown?: number; // UI propery for upcoming
}

export const tmdb = {
    getTrending: async (type: 'movie' | 'tv' | 'all' = 'movie', timeWindow: 'day' | 'week' = 'week') => {
        return fetchTMDB(`/trending/${type}/${timeWindow}`);
    },

    search: async (query: string, type: 'movie' | 'tv') => {
        console.log(`[TMDB] search called: query="${query}", type="${type}"`);
        if (!query.trim()) return { results: [] };

        // Explicitly constructing URL as requested by user:
        // https://api.themoviedb.org/3/search/tv?query={user_entry}&api_key={api_key}
        const url = `${BASE_URL}/search/${type}?query=${encodeURIComponent(query)}&api_key=${TMDB_API_KEY}`;

        console.log(`[TMDB] Fetching explicitly: ${url}`);

        try {
            const res = await fetch(url);
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                console.error('[TMDB] Search Request Failed:', res.status, errBody);
                throw new Error(`TMDB Search Error: ${res.status}`);
            }
            return res.json();
        } catch (error) {
            console.error('[TMDB] Search Network Error:', error);
            throw error;
        }
    },

    getDetails: async (id: number, type: 'movie' | 'tv') => {
        return fetchTMDB(`/${type}/${id}`, {
            append_to_response: 'watch/providers,credits,external_ids,videos'
        });
    }
};

// Helper to safely calculate total runtime (Binge Time) for sorting and display
export const calculateMediaRuntime = (media: any): number => {
    // 1. Handle Movies (Simple) or explicit runtime
    if (media.type === 'movie' || media.tmdb_type === 'movie' || media.media_type === 'movie') {
        return media.runtime || 0;
    }

    // 2. Handle Shows (Complex)
    // Check for nested metadata if passed a watchlist item
    const data = media.metadata || media;

    // Safety check for TV type (though logic below is safe regardless)
    let avgRuntime = 0;

    // Priority 1: TVMaze (Most accurate average)
    if (data.tvmaze_runtime) {
        avgRuntime = data.tvmaze_runtime;
    }
    // Priority 2: TMDB Episode Runtime (Min or Average)
    else if (data.episode_run_time && data.episode_run_time.length > 0) {
        // Use minimum length to be conservative
        avgRuntime = Math.min(...data.episode_run_time);
    }
    // Priority 3: Last Episode Fallback (Good for shows with 0 avg)
    else if (data.last_episode_to_air?.runtime) {
        avgRuntime = data.last_episode_to_air.runtime;
    }
    // Priority 4: Generic Runtime property
    else if (data.runtime) {
        avgRuntime = data.runtime;
    }

    const episodes = data.number_of_episodes || 0;

    // If we found a runtime and have episodes, return total
    if (avgRuntime && episodes) {
        return avgRuntime * episodes;
    }

    // Fallback: If no episodes count but we have runtime, return just runtime (better than 0)
    return avgRuntime || 0;
};
