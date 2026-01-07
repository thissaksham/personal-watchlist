import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { determineShowStatus, pruneMetadata, type WatchStatus } from '../src/lib/watchlist-shared';
import type { TMDBMedia } from '../src/lib/tmdb';

// --- Helper Functions ---

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            flatrate: sources.filter((s: any) => s.type === 'sub').map(mapWatchmodeSource),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rent: sources.filter((s: any) => s.type === 'rent').map(mapWatchmodeSource),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            buy: sources.filter((s: any) => s.type === 'buy').map(mapWatchmodeSource),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            free: sources.filter((s: any) => s.type === 'free').map(mapWatchmodeSource)
        };
    } catch (e) {
        console.error('[Watchmode Fallback Error]:', e);
        return null;
    }
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
            .order('created_at', { ascending: true }); // No limit, fetch all

        if (fetchError) throw fetchError;
        if (!candidates || candidates.length === 0) {
            console.log('No items found for refresh.');
            return;
        }

        console.log(`Found ${candidates.length} items to process.`);

        const BATCH_SIZE = 10;
        const DELAY_MS = 60000; // 1 minute between batches
        let processedCount = 0;
        let successCount = 0;

        for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
            const batch = candidates.slice(i, i + BATCH_SIZE);
            console.log(`\n--- Processing Batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} items) ---`);

            const batchResults = await Promise.all(batch.map(async (item) => {
                try {
                    const tmdbType = item.type === 'show' ? 'tv' : 'movie';
                    console.log(`[Processing] ${item.type.toUpperCase()}: ${item.title}`);
                    
                    const detailsRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${item.tmdb_id}?api_key=${TMDB_API_KEY}&append_to_response=watch/providers,videos,external_ids,release_dates`);
                    if (!detailsRes.ok) throw new Error(`TMDB Fetch Failed`);
                    
                    const details = await detailsRes.json();

                    let newStatus = item.status as WatchStatus;
                    if (item.type === 'show') {
                        newStatus = determineShowStatus(details as TMDBMedia, item.last_watched_season || 0, item.progress || 0);
                    } else {
                        const providers = details['watch/providers']?.results?.[region];
                        let hasProviders = (providers?.flatrate?.length > 0) || (providers?.ads?.length > 0);
                        
                        if (!hasProviders && WATCHMODE_API_KEY) {
                            const wmProviders = await fetchWatchmodeFallback(item.tmdb_id, item.type as 'movie' | 'tv', region, WATCHMODE_API_KEY);
                            if (wmProviders) {
                                details['watch/providers'] = { results: { [region]: wmProviders } };
                                hasProviders = (wmProviders.flatrate.length > 0) || (wmProviders.free?.length > 0);
                            }
                        }

                        if (hasProviders && item.status === 'movie_coming_soon') {
                            newStatus = 'movie_on_ott';
                        }
                    }

                    const updatedMeta = { ...(item.metadata || {}), ...details, last_updated_at: Date.now() };
                    const pruned = pruneMetadata(updatedMeta, region);

                    const { error: updateError } = await supabase
                        .from('watchlist')
                        .update({ metadata: pruned, status: newStatus })
                        .eq('id', item.id);

                    if (updateError) throw updateError;
                    console.log(`[Success] ${item.title}: ${item.status} -> ${newStatus}`);
                    return true;
                } catch (err: unknown) {
                    console.error(`[Error] Failed to process ${item.title}:`, err instanceof Error ? err.message : String(err));
                    return false;
                }
            }));

            successCount += batchResults.filter(r => r).length;
            processedCount += batch.length;

            if (i + BATCH_SIZE < candidates.length) {
                console.log(`Waiting ${DELAY_MS / 1000} seconds before next batch...`);
                await sleep(DELAY_MS);
            }
        }

        console.log(`\n--- Refresh Job Complete: ${successCount}/${processedCount} successful ---`);

    } catch (err: unknown) {
        console.error('CRITICAL: Refresh Job Failed:', err);
        process.exit(1);
    }
}

runRefresh();
