const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = '/api/tmdb';

if (!TMDB_API_KEY) {
    console.error("Missing TMDB API Key! Check .env");
}

// Logic to determine Auth type:
// V4 Read Access Tokens are long JWTs (usually start with eyJ)
// V3 API Keys are shorter hex strings (~32 chars)
const isBearerToken = TMDB_API_KEY && TMDB_API_KEY.length > 60;

// Initialize Region from LocalStorage (User Preference)
// This will be synced with user_metadata on login
// DEPRECATED: Use PreferencesContext
// export let TMDB_REGION = localStorage.getItem('tmdb_region') || 'IN';

export const REGIONS = [
    { code: 'IN', name: 'India', flag: '🇮🇳' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
    { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇱' }, // Flag fix
    { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
    { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
    { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
    { code: 'FI', name: 'Finland', flag: '🇫🇮' },
    { code: 'GR', name: 'Greece', flag: '🇬🇷' },
    { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
    { code: 'NO', name: 'Norway', flag: '🇳🇴' },
    { code: 'PL', name: 'Poland', flag: '🇵🇱' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
    { code: 'RU', name: 'Russia', flag: '🇷🇺' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
    { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
].filter((v, i, a) => a.findIndex(t => (t.code === v.code)) === i);

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
async function fetchTMDB(endpoint: string, params: Record<string, string> = {}, region: string) {
    const queryParams: any = {
        region: region,
        ...params,
    };

    // Key is injected by Vite Proxy
    // if (!isBearerToken && TMDB_API_KEY) {
    //     queryParams.api_key = TMDB_API_KEY;
    // }

    const query = new URLSearchParams(queryParams).toString();
    const url = `${BASE_URL}${endpoint}?${query}`;
    const safeUrl = url.replace(/api_key=[^&]*&?/i, 'api_key=HIDDEN&');
    console.log(`[TMDB] Fetching: ${safeUrl}`);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 60000); // 60s timeout for mobile stability

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
            const safeUrl = url.replace(/api_key=[^&]*&?/i, 'api_key=HIDDEN&');
            throw new Error(`Request timed out for: ${safeUrl}`);
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
        season_number: number;
        episode_number: number;
        air_date: string;
    };
    next_episode_to_air?: {
        season_number: number;
        episode_number: number;
        air_date: string;
    };
    external_ids?: {
        imdb_id?: string;
    };
    tvmaze_runtime?: number;
    status?: string;
    'watch/providers'?: any;
    seasons?: any[];
    countdown?: number; // UI propery for upcoming
    digital_release_date?: string;
    theatrical_release_date?: string;
    // App-Specific Overrides
    manual_date_override?: boolean;
    manual_release_date?: string | null; // New priority field
    manual_ott_name?: string;
    moved_to_library?: boolean;
    dismissed_from_upcoming?: boolean;
    // UI Transient Properties
    tmdbMediaType?: 'movie' | 'tv' | 'show'; // 'show' is legacy alias for 'tv'
    tabCategory?: 'ott' | 'theatrical' | 'coming_soon' | 'other';
    seasonInfo?: string;
}

// Map TMDB regions to RapidAPI regions
const REGION_MAP: Record<string, string> = {
    'IN': 'india',
    'GB': 'uk',
    'US': 'usa',
    'AE': 'ae',
    'AU': 'au',
    'BG': 'bg',
    'CA': 'ca',
    'DK': 'dk',
    'EG': 'eg',
    'FI': 'fi',
    'GR': 'gr',
    'HU': 'hu',
    'ID': 'id',
    'IE': 'ie',
    'IT': 'it',
    'JP': 'jp',
    'KR': 'kr',
    'MY': 'my',
    'NL': 'nl',
    'NO': 'no',
    'NZ': 'nz',
    'PH': 'ph',
    'PL': 'pl',
    'PT': 'pt',
    'RU': 'ru',
    'SA': 'sa',
    'SE': 'se',
    'SG': 'sg',
    'TH': 'th',
    'TW': 'tw',
    'ZA': 'za'
};

const slugify = (text: string) => {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // API seems to want alphabets/numbers only based on "backtothefuture"
        .trim();
};

async function fetchRapidOTT(title: string, regionCode: string, targetYear?: string) {
    const region = REGION_MAP[regionCode] || regionCode.toLowerCase();
    const slug = slugify(title);
    const url = `/api/rapid/search/${region}/${slug}`;

    console.log(`[RapidAPI] Fetching fallback OTT: ${url} (Target Year: ${targetYear})`);

    try {
        const res = await fetch(url);

        if (!res.ok) throw new Error(`RapidAPI Error: ${res.status}`);
        const data = await res.json();

        let providers: any[] = [];
        const results = Array.isArray(data) ? data : (data ? [data] : []);

        if (results.length > 0) {
            // Find precise match by year if data contains year info
            const match = results.find(item => {
                const itemYear = String(item.year || item.release_year || '');
                return itemYear === targetYear;
            });

            if (match) {
                console.log(`[RapidAPI] Exact year match found for ${title} (${targetYear})`);
                providers = match.providers || match.platforms || (Array.isArray(match) ? match : []);
            } else if (!results[0].year && !results[0].release_year) {
                // If the response doesn't have year metadata, assume the slug was specific enough
                // and the response is just an array of providers for that slug.
                providers = results[0].providers || results[0].platforms || (Array.isArray(results[0]) ? results[0] : results);
            } else {
                console.warn(`[RapidAPI] No year match found for ${title}. Target: ${targetYear}, Available: ${results.map(r => r.year).join(', ')}`);
            }
        }

        if (providers.length > 0) {
            return {
                flatrate: providers.map(p => ({
                    provider_name: p.name || p.provider_name,
                    logo_path: null,
                    provider_id: 0
                }))
            };
        }
        return null;
    } catch (err) {
        console.error('[RapidAPI] Fallback failed:', err);
        return null;
    }
}

export const tmdb = {
    getTrending: async (type: 'movie' | 'tv' | 'all' = 'movie', timeWindow: 'day' | 'week' = 'week', region: string = 'IN') => {
        return fetchTMDB(`/trending/${type}/${timeWindow}`, {}, region);
    },

    search: async (query: string, type: 'movie' | 'tv' | 'multi', region: string = 'IN') => {
        console.log(`[TMDB] search called: query="${query}", type="${type}"`);
        if (!query.trim()) return { results: [] };

        // Explicitly constructing URL as requested by user:
        // https://api.themoviedb.org/3/search/tv?query={user_entry}&api_key={api_key}
        // Proxy handles Key
        const url = `${BASE_URL}/search/${type}?query=${encodeURIComponent(query)}&region=${region}`;
        const safeUrl = url.replace(/api_key=[^&]*&?/i, 'api_key=HIDDEN&');

        console.log(`[TMDB] Fetching explicitly: ${safeUrl}`);

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

    getDetails: async (id: number, type: 'movie' | 'tv', region: string = 'IN') => {
        const data = await fetchTMDB(`/${type}/${id}`, {
            append_to_response: 'watch/providers,external_ids,videos'
        }, region);

        // Check if TMDB has provider data for the user's region
        const tmdbProviders = data['watch/providers']?.results?.[region];
        const hasProviders = tmdbProviders && (tmdbProviders.flatrate || tmdbProviders.rent || tmdbProviders.buy);

        if (!hasProviders) {
            console.warn(`[TMDB] No providers found for ${region}. Triggering RapidAPI fallback...`);

            // Extract the year for precise matching
            const releaseDate = data.release_date || data.first_air_date || '';
            const year = releaseDate.split('-')[0];

            const fallback = await fetchRapidOTT(data.title || data.name, region, year);
            if (fallback) {
                // Merge fallback into the response structure
                if (!data['watch/providers']) data['watch/providers'] = { results: {} };
                if (!data['watch/providers'].results) data['watch/providers'].results = {};
                data['watch/providers'].results[region] = fallback;
                console.log(`[TMDB] Fallback successful for ${region}`);
            }
        }

        return data;
    },

    getReleaseDates: async (id: number) => {
        // Release dates are global, but maybe we should filter? No, standard API returns all.
        // We do not need region param here necessarily, unless we want to filter on server side.
        // For now, keep it simple.
        // Passing 'US' as default just to satisfy fetchTMDB signature if we change it.
        // But simpler:
        return fetchTMDB(`/movie/${id}/release_dates`, {}, 'US');
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
