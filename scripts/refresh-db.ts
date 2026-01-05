import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// --- Types ---
type WatchStatus = 
    | 'movie_watched' | 'movie_unwatched' | 'movie_on_ott' | 'movie_coming_soon' | 'movie_dropped'
    | 'show_new' | 'show_ongoing' | 'show_watching' | 'show_returning' | 'show_finished' | 'show_watched' | 'show_dropped';

interface Season {
    season_number: number;
    air_date?: string;
}

interface ShowMetadata {
    status?: string;
    type?: string;
    seasons?: Season[];
    last_episode_to_air?: {
        air_date: string;
        season_number: number;
        episode_number: number;
    };
    next_episode_to_air?: {
        air_date: string;
        season_number: number;
        episode_number: number;
    };
}

// --- Helper Functions ---

const parseDateLocal = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const datePart = dateStr.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const d = parseInt(parts[2]);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return new Date(y, m - 1, d);
        }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
};

const getTodayValues = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

const determineShowStatus = (metadata: ShowMetadata, lastWatchedSeason: number, progress: number = 0): WatchStatus => {
    if (lastWatchedSeason === 0 && progress > 0) return 'show_watching';
    const seasons = metadata.seasons || [];
    const today = getTodayValues();
    const releasedSeasons = seasons.filter((s) => s.season_number > 0 && s.air_date && parseDateLocal(s.air_date)! <= today);
    const totalReleased = releasedSeasons.length;

    if (totalReleased === 0) return metadata.last_episode_to_air ? 'show_ongoing' : 'show_new';
    if (lastWatchedSeason === 0) {
        const isFinished = metadata.status === 'Ended' || metadata.status === 'Canceled' || metadata.type === 'Miniseries';
        return isFinished ? 'show_finished' : 'show_ongoing';
    }
    if (lastWatchedSeason < totalReleased) return 'show_watching';

    if (metadata.next_episode_to_air?.air_date) {
        const nextDate = parseDateLocal(metadata.next_episode_to_air.air_date);
        if (nextDate && nextDate > today) {
            return metadata.next_episode_to_air.season_number === lastWatchedSeason ? 'show_watching' : 'show_returning';
        }
    }
    return 'show_watched';
};

const mapWatchmodeSource = (s: any) => ({
    provider_id: s.source_id,
    provider_name: s.name,
    logo_path: null,
    display_priority: 10
});

const fetchWatchmodeFallback = async (tmdbId: number, type: 'movie' | 'tv', region: string, apiKey: string) => {
    if (!apiKey) return null;
    try {
        const searchField = type === 'movie' ? 'tmdb_movie_id' : 'tmdb_tv_id';
        const searchUrl = `https://api.watchmode.com/v1/search/?apiKey=${apiKey}&search_field=${searchField}&search_value=${tmdbId}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) return null;
        const searchData = await searchRes.json();
        const watchmodeId = searchData.title_results?.[0]?.id;
        if (!watchmodeId) return null;

        const sourcesUrl = `https://api.watchmode.com/v1/title/${watchmodeId}/sources/?apiKey=${apiKey}&regions=${region}`;
        const sourcesRes = await fetch(sourcesUrl);
        if (!sourcesRes.ok) return null;
        const sourcesData = await sourcesRes.json();
        const sources = Array.isArray(sourcesData) ? sourcesData : [];

        return {
            flatrate: sources.filter((s: any) => s.type === 'sub').map(mapWatchmodeSource),
            rent: sources.filter((s: any) => s.type === 'rent').map(mapWatchmodeSource),
            buy: sources.filter((s: any) => s.type === 'buy').map(mapWatchmodeSource),
            free: sources.filter((s: any) => s.type === 'free').map(mapWatchmodeSource)
        };
    } catch (e) {
        console.error('[Watchmode Fallback Error]:', e);
        return null;
    }
};

const pruneMetadata = (meta: any, region: string) => {
    if (!meta) return meta;
    const providers = meta['watch/providers']?.results;
    let leanProviders = {};
    if (providers && providers[region]) {
        leanProviders = { results: { [region]: providers[region] } };
    }
    let leanVideos = meta.videos;
    if (meta.videos?.results) {
        const trailer = meta.videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
        leanVideos = trailer ? { results: [trailer] } : { results: [] };
    }
    
    const {
        backdrop_path, overview, release_date, first_air_date, runtime, status,
        next_episode_to_air, last_episode_to_air, seasons, external_ids,
        genres, number_of_episodes, number_of_seasons, episode_run_time, tvmaze_runtime,
        digital_release_date, digital_release_note, theatrical_release_date, moved_to_library,
        manual_date_override, manual_ott_name, dismissed_from_upcoming, last_updated_at
    } = meta;

    return {
        title: meta.title || meta.name,
        name: meta.name || meta.title,
        poster_path: meta.poster_path,
        backdrop_path, overview,
        vote_average: meta.vote_average,
        release_date, first_air_date, runtime, status,
        next_episode_to_air, last_episode_to_air, seasons, external_ids,
        genres, number_of_episodes, number_of_seasons,
        episode_run_time, tvmaze_runtime,
        digital_release_date, digital_release_note, theatrical_release_date, moved_to_library,
        manual_date_override, manual_ott_name, dismissed_from_upcoming, last_updated_at,
        'watch/providers': leanProviders,
        videos: leanVideos
    };
};

// --- Main Execution ---

async function runRefresh() {
    console.log('--- Starting Refresh Job ---');
    
    const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY;
    const WATCHMODE_API_KEY = process.env.VITE_WATCHMODE_API_KEY;
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const region = 'IN';

    if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Missing environment variables. Ensure VITE_TMDB_API_KEY, VITE_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are set.');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        console.log('Fetching items to refresh from Supabase...');
        const { data: candidates, error: fetchError } = await supabase
            .from('watchlist')
            .select('*')
            .in('status', ['movie_coming_soon', 'movie_on_ott', 'show_returning', 'show_ongoing', 'show_watching', 'show_new'])
            .order('updated_at', { ascending: true })
            .limit(50);

        if (fetchError) throw fetchError;
        if (!candidates || candidates.length === 0) {
            console.log('No items found for refresh.');
            return;
        }

        console.log(`Found ${candidates.length} items to process.`);

        const results = await Promise.all(candidates.map(async (item) => {
            try {
                const tmdbType = item.type === 'show' ? 'tv' : 'movie';
                console.log(`[Processing] ${item.type.toUpperCase()}: ${item.title} (ID: ${item.tmdb_id})`);
                
                // Fetch from TMDB
                const detailsRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${item.tmdb_id}?api_key=${TMDB_API_KEY}&append_to_response=watch/providers,videos,external_ids,release_dates`);
                if (!detailsRes.ok) throw new Error(`TMDB Fetch Failed for ${item.title}`);
                
                const details = await detailsRes.json();

                // Calculate Logic
                let newStatus = item.status;
                if (item.type === 'show') {
                    newStatus = determineShowStatus(details, item.last_watched_season || 0, item.progress || 0);
                } else {
                    let providers = details['watch/providers']?.results?.[region];
                    let hasProviders = (providers?.flatrate?.length > 0) || (providers?.ads?.length > 0);
                    
                    // Watchmode Fallback if no providers found on TMDB
                    if (!hasProviders && WATCHMODE_API_KEY) {
                        console.log(`[Watchmode Fallback] Checking ${item.title}...`);
                        const wmProviders = await fetchWatchmodeFallback(item.tmdb_id, item.type as any, region, WATCHMODE_API_KEY);
                        if (wmProviders) {
                            details['watch/providers'] = { results: { [region]: wmProviders } };
                            hasProviders = (wmProviders.flatrate.length > 0) || (wmProviders.free?.length > 0);
                        }
                    }

                    if (hasProviders && item.status === 'movie_coming_soon') {
                        newStatus = 'movie_on_ott';
                    }
                }

                const updatedMeta = {
                    ...(item.metadata || {}),
                    ...details,
                    last_updated_at: Date.now()
                };
                const pruned = pruneMetadata(updatedMeta, region);

                // Save back to Supabase
                const { error: updateError } = await supabase
                    .from('watchlist')
                    .update({ 
                        metadata: pruned, 
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', item.id);

                if (updateError) throw updateError;

                console.log(`[Success] ${item.title}: ${item.status} -> ${newStatus}`);
                return { title: item.title, success: true };
            } catch (err: any) {
                console.error(`[Error] Failed to process ${item.title}:`, err.message);
                return { title: item.title, success: false, error: err.message };
            }
        }));

        const successCount = results.filter(r => r.success).length;
        console.log(`--- Refresh Job Complete: ${successCount}/${results.length} successful ---`);

    } catch (err: any) {
        console.error('CRITICAL: Refresh Job Failed:', err);
        process.exit(1);
    }
}

runRefresh();
