const API_KEY = import.meta.env.VITE_WATCHMODE_API_KEY;
const BASE_URL = 'https://api.watchmode.com/v1';

if (!API_KEY) {
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

export const fetchWatchmodeDetails = async (tmdbId: number, type: 'movie' | 'tv', region: string) => {
    if (!API_KEY) return null;

    try {
        // 1. Search for Title by TMDB ID to get Watchmode ID
        // Endpoint: /search/?search_field=tmdb_movie_id&search_value={id}
        const searchField = type === 'movie' ? 'tmdb_movie_id' : 'tmdb_tv_id';
        const searchUrl = `${BASE_URL}/search/?apiKey=${API_KEY}&search_field=${searchField}&search_value=${tmdbId}`;

        console.log(`[Watchmode] Lookup ID: ${searchUrl.replace(API_KEY, 'HIDDEN')}`);

        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) throw new Error(`Search Failed: ${searchRes.status}`);

        const searchData = await searchRes.json();
        const results = searchData.title_results || [];

        if (results.length === 0) {
            console.log(`[Watchmode] No match found for TMDB ${tmdbId}`);
            return null;
        }

        const watchmodeId = results[0].id;

        // 2. Get Sources
        // Endpoint: /title/{id}/sources/?regions={region}
        const sourcesUrl = `${BASE_URL}/title/${watchmodeId}/sources/?apiKey=${API_KEY}&regions=${region}`;
        console.log(`[Watchmode] Fetching Sources: ${sourcesUrl.replace(API_KEY, 'HIDDEN')}`);

        const sourcesRes = await fetch(sourcesUrl);
        if (!sourcesRes.ok) throw new Error(`Sources Failed: ${sourcesRes.status}`);

        const sourcesData = await sourcesRes.json();

        // Map to TMDB structure
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
        console.error("[Watchmode] Error:", e);
        return null;
    }
};

const mapSource = (s: WatchmodeSource) => ({
    provider_id: s.source_id,
    provider_name: s.name,
    logo_path: null, // Watchmode doesn't provide TMDB-compatible logo paths easily, we might need a local map or just use text
    display_priority: 10
});
