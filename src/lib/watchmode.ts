const API_KEYS = import.meta.env.VITE_WATCHMODE_API_KEY ? import.meta.env.VITE_WATCHMODE_API_KEY.split(',').map((k: string) => k.trim()).filter(Boolean) : [];
const BASE_URL = 'https://api.watchmode.com/v1';

if (API_KEYS.length === 0) {
    console.warn("Missing VITE_WATCHMODE_API_KEY. Watchmode fallback will be disabled.");
}

interface WatchmodeSource {
    source_id: number;
    name: string;
    type: 'sub' | 'rent' | 'buy' | 'free';
    region: string;
    ios_url: string;
    android_url: string;
    web_url: string;
    format: string;
    price?: number | null;
    seasons?: number;
    episodes?: number;
}

let currentKeyIndex = 0;

const fetchWithRotation = async (urlGenerator: (key: string) => string) => {
    if (API_KEYS.length === 0) return null;

    // Try starting from the current index, and wrap around once if needed
    for (let i = 0; i < API_KEYS.length; i++) {
        const index = (currentKeyIndex + i) % API_KEYS.length;
        const key = API_KEYS[index];
        const url = urlGenerator(key);

        try {
            const res = await fetch(url);
            
            // If we hit a rate limit or quota issue
            if (res.status === 402 || res.status === 429) {
                console.warn(`[Watchmode] Key index ${index} exhausted (Status ${res.status}). Trying next key...`);
                continue; 
            }

            if (!res.ok) {
                throw new Error(`Status ${res.status}`);
            }

            // Successfully used this key, update the index for future calls
            currentKeyIndex = index;
            return await res.json();
            
        } catch (e) {
            console.error(`[Watchmode] Error with key index ${index}:`, e);
            // If it's the last key, rethrow to be caught by the caller
            if (i === API_KEYS.length - 1) throw e;
        }
    }
    return null;
};

export const fetchWatchmodeDetails = async (tmdbId: number, type: 'movie' | 'tv', region: string) => {
    if (API_KEYS.length === 0) return null;

    try {
        // 1. Search for Title
        const searchField = type === 'movie' ? 'tmdb_movie_id' : 'tmdb_tv_id';
        const searchData = await fetchWithRotation((key) => 
            `${BASE_URL}/search/?apiKey=${key}&search_field=${searchField}&search_value=${tmdbId}`
        );

        const results = searchData?.title_results || [];
        if (results.length === 0) {
            console.log(`[Watchmode] No match found for TMDB ${tmdbId}`);
            return null;
        }

        const watchmodeId = results[0].id;

        // 2. Get Sources
        const sourcesData = await fetchWithRotation((key) => 
            `${BASE_URL}/title/${watchmodeId}/sources/?apiKey=${key}&regions=${region}`
        );

        const sources: WatchmodeSource[] = Array.isArray(sourcesData) ? sourcesData : [];

        const flatrate = sources.filter(s => s.type === 'sub').map(mapSource);
        const rent = sources.filter(s => s.type === 'rent').map(mapSource);
        const buy = sources.filter(s => s.type === 'buy').map(mapSource);
        const free = sources.filter(s => s.type === 'free').map(mapSource);

        if (flatrate.length === 0 && rent.length === 0 && buy.length === 0 && free.length === 0) {
            return null;
        }

        return {
            flatrate,
            rent,
            buy,
            free
        };

    } catch (e) {
        console.error("[Watchmode] Global Error:", e);
        return null;
    }
};

const mapSource = (s: WatchmodeSource) => ({
    provider_id: s.source_id,
    provider_name: s.name,
    logo_path: null,
    display_priority: 10
});
