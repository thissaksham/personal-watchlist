import { createClient } from '@supabase/supabase-js';
import { determineShowStatus, pruneMetadata, type WatchStatus } from '../src/lib/watchlist-shared';
import type { TMDBMedia } from '../src/lib/tmdb';

// --- Handler ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // 3. Process items in Parallel to beat the 10-second timeout

        const results = await Promise.all((candidates || []).map(async (item) => {
            try {
                const tmdbType = item.type === 'show' ? 'tv' : 'movie';
                
                // Fetch from TMDB
                const detailsRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${item.tmdb_id}?api_key=${TMDB_API_KEY}&append_to_response=watch/providers,videos,external_ids,release_dates`);
                if (!detailsRes.ok) return { title: item.title, success: false, error: 'TMDB Fetch Failed' };
                
                const details = await detailsRes.json();

                // Calculate Logic
                let newStatus = item.status as WatchStatus;
                if (item.type === 'show') {
                    newStatus = determineShowStatus(details as TMDBMedia, item.last_watched_season || 0, item.progress || 0);
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
            } catch (err: unknown) {
                return { title: item.title, success: false, error: err instanceof Error ? err.message : 'Unknown error' };
            }
        }));

        return response.status(200).json({ 
            status: 'ok', 
            count: results.length,
            processed: results.filter(r => r.success).map(r => r.title)
        });
    } catch (err: unknown) {
        console.error('Refresh Job Failed:', err);
        return response.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
}
