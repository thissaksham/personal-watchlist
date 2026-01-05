import { createClient } from '@supabase/supabase-js';

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

// --- Helper Functions (Shared Logic) ---

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
    // Whitelist
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

// --- Handler ---

export default async function handler(request: any, response: any) {
    // 1. Security Check
    const cronSecret = process.env.CRON_SECRET || process.env.VITE_CRON_SECRET;
    const authHeader = request.headers['authorization'];
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return response.status(401).json({ error: 'Unauthorized' });
    }

    const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY;
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Must be set in Vercel dashboard

    if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return response.status(500).json({ error: 'Missing environment variables' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const region = 'IN';

    try {
        // 2. Fetch stale items (candidates for refresh)
        const { data: candidates, error: fetchError } = await supabase
            .from('watchlist')
            .select('*')
            .in('status', ['movie_coming_soon', 'movie_on_ott', 'show_returning', 'show_ongoing', 'show_watching', 'show_new'])
            .order('updated_at', { ascending: true })
            .limit(5);

        if (fetchError) throw fetchError;

        const results = [];

        for (const item of (candidates || [])) {
            const tmdbType = item.type === 'show' ? 'tv' : 'movie';
            
            // 3. Update from TMDB
            const detailsRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${item.tmdb_id}?api_key=${TMDB_API_KEY}&append_to_response=watch/providers,videos,external_ids,release_dates`);
        // 3. Process items in Parallel to beat the 10-second timeout
        const results = await Promise.all((candidates || []).map(async (item) => {
            try {
                const tmdbType = item.type === 'show' ? 'tv' : 'movie';
                
                // Fetch from TMDB
                const detailsRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${item.tmdb_id}?api_key=${TMDB_API_KEY}&append_to_response=watch/providers,videos,external_ids,release_dates`);
                if (!detailsRes.ok) return { title: item.title, success: false, error: 'TMDB Fetch Failed' };
                
                const details = await detailsRes.json();

                // Calculate Logic
                let newStatus = item.status;
                if (item.type === 'show') {
                    newStatus = determineShowStatus(details, item.last_watched_season || 0, item.progress || 0);
                } else {
                    const providers = details['watch/providers']?.results?.[region];
                    const hasProviders = (providers?.flatrate?.length > 0) || (providers?.ads?.length > 0);
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

                return { 
                    title: item.title, 
                    oldStatus: item.status, 
                    newStatus, 
                    success: !updateError 
                };
            } catch (err: any) {
                return { title: item.title, success: false, error: err.message };
            }
        }));

        return response.status(200).json({ 
            status: 'ok', 
            count: results.length,
            processed: results.filter(r => r.success).map(r => r.title)
        });
    } catch (err: any) {
        console.error('Refresh Job Failed:', err);
        return response.status(500).json({ error: err.message });
    }
}
