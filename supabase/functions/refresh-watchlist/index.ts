// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Configuration
const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// --- Helper Functions (Ported from lib/dateUtils.ts) ---

const getTodayValues = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

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

// --- TMDB API Helper (Ported from lib/tmdb.ts) ---

const tmdb = {
  async getDetails(id: number, type: 'movie' | 'tv', region: string = 'IN') {
    if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY not set");
    
    // Fetch details with providers
    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=watch/providers,videos,external_ids,release_dates,content_ratings`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB Error: ${res.statusText}`);
    return await res.json();
  },

  async getReleaseDates(id: number) {
    if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY not set");
    const url = `https://api.themoviedb.org/3/movie/${id}/release_dates?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB Error: ${res.statusText}`);
    return await res.json();
  }
};


// --- Core Logic (Ported from watchlistUtils.ts) ---
// Note: 'existingMetadata' and 'currentStatus' come from the DB row we act upon
const processItem = async (item: any, region: string) => {
  const tmdbId = item.tmdb_id;
  const type = item.type; // 'movie' | 'show'
  const currentStatus = item.status;
  const existingMetadata = item.metadata;

  console.log(`Processing ${type} ID ${tmdbId} (${existingMetadata?.title || 'Unknown'})...`);

  const tmdbType = type === 'show' ? 'tv' : 'movie';
  
  // Parallel fetch: Details + Release Dates (if movie)
  const [details, releaseData] = await Promise.all([
      tmdb.getDetails(tmdbId, tmdbType, region),
      tmdbType === 'movie' ? tmdb.getReleaseDates(tmdbId) : Promise.resolve({ results: [] })
  ]);

  let theatricalDate = null;
  let indianDigitalDate = null;
  let indianDigitalNote = null;

  // --- Movie Specific Logic ---
  if (tmdbType === 'movie') {
      constresults = releaseData?.results || [];
      const extractDates = (regionCode: string) => {
          const regionData = results.find((r: any) => r.iso_3166_1 === regionCode);
          if (!regionData?.release_dates) return null;
          const theatrical = regionData.release_dates.find((d: any) => d.type === 3) || regionData.release_dates.find((d: any) => d.type === 2);
          const digital = regionData.release_dates.find((d: any) => d.type === 4) || regionData.release_dates.find((d: any) => d.type === 5);
          return {
              theatrical: theatrical?.release_date,
              digital: digital?.release_date,
              digitalNote: digital?.note || null,
              hasData: !!(theatrical || digital)
          };
      };

      const inDates = extractDates(region); // Try Region (IN)
      if (inDates?.digital) {
          indianDigitalDate = inDates.digital;
          indianDigitalNote = inDates.digitalNote;
      }
      if (inDates?.theatrical) {
          theatricalDate = inDates.theatrical;
      }

      // Global Fallback Logic for Theatrical Date
      if (!theatricalDate && results.length > 0) {
          let earliestDate = null;
          // Flatten all release dates
          const allDates = results.flatMap((r: any) => r.release_dates || [])
            .filter((d: any) => [2,3,4].includes(d.type) && d.release_date);
          
          for (const d of allDates) {
            if (!earliestDate || d.release_date < earliestDate) {
               earliestDate = d.release_date;
            }
          }
          if (earliestDate) theatricalDate = earliestDate;
      }
  }

  // Provider Data Extraction
  const providers = details['watch/providers']?.results?.[region] || {};
  const allStreamingOrRental = [
      ...(providers.flatrate || []),
      ...(providers.ads || []),
      ...(providers.free || []),
      ...(providers.rent || []),
      ...(providers.buy || [])
  ];

  const today = getTodayValues();
  let initialStatus = type === 'movie' ? 'movie_unwatched' : 'show_new';
  let movedToLibrary = true;

  // --- Status Calculation Logic ---
  if (tmdbType === 'movie') {
      let releaseDateStr = details.release_date;
      if (theatricalDate && (!releaseDateStr || theatricalDate < releaseDateStr)) {
          releaseDateStr = theatricalDate;
      }
      const releaseDateObj = parseDateLocal(releaseDateStr);
      const hasProvidersIN = allStreamingOrRental.length > 0;
      const indianDigDateObj = parseDateLocal(indianDigitalDate);
      const hasFutureIndianDigitalDate = indianDigDateObj && indianDigDateObj > today;
      const hasManualOverride = existingMetadata?.manual_date_override;
      
      // Allow moving to OTT if:
      // 1. Released (Theatrical/General passed)
      // 2. Any digital date exists (even past)
      // 3. Or providers exist (handled below)
      const isReleased = !releaseDateObj || releaseDateObj <= today;
      const hasValidDigitalTransition = currentStatus === 'movie_coming_soon' && isReleased && !!indianDigDateObj;

      let isAvailableGlobally = false;
      if (releaseDateObj) {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          if (releaseDateObj < sixMonthsAgo) {
            // Check global providers (scan all regions in response)
            const allProvidersMap = details['watch/providers']?.results || {};
            for (const r of Object.values(allProvidersMap)) {
               // @ts-ignore
               if ((r.flatrate?.length > 0) || (r.rent?.length > 0) || (r.buy?.length > 0)) {
                   isAvailableGlobally = true;
                   break;
               }
            }
          }
      }

      if (hasProvidersIN && (!releaseDateObj || releaseDateObj <= today)) {
          if (!currentStatus) {
              movedToLibrary = true;
              initialStatus = 'movie_unwatched';
          } else if (currentStatus === 'movie_coming_soon') {
              movedToLibrary = false;
              initialStatus = 'movie_on_ott';
          } else {
              movedToLibrary = true;
              initialStatus = currentStatus === 'movie_watched' ? 'movie_watched' : 'movie_unwatched';
          }
      } else if (hasProvidersIN || hasFutureIndianDigitalDate || hasValidDigitalTransition || hasManualOverride) {
          if (!currentStatus || currentStatus === 'movie_coming_soon' || hasManualOverride || hasProvidersIN) {
              movedToLibrary = false;
              initialStatus = 'movie_on_ott';
          } else {
              movedToLibrary = true;
              initialStatus = 'movie_unwatched';
          }
      } else if (isAvailableGlobally) {
          if (!currentStatus) {
            movedToLibrary = true;
            initialStatus = 'movie_unwatched';
          } else if (currentStatus === 'movie_coming_soon') {
            movedToLibrary = false;
            initialStatus = 'movie_on_ott';
          } else {
            movedToLibrary = true;
            initialStatus = 'movie_unwatched';
          }
      } else if (releaseDateObj && releaseDateObj < new Date(new Date().setFullYear(new Date().getFullYear() - 1))) {
           if (!currentStatus) {
               movedToLibrary = true;
               initialStatus = 'movie_unwatched';
           } else if (currentStatus === 'movie_coming_soon') {
               movedToLibrary = false;
               initialStatus = 'movie_on_ott';
           } else {
               movedToLibrary = true;
               initialStatus = 'movie_unwatched';
           }
      } else {
          movedToLibrary = false;
          initialStatus = 'movie_coming_soon';
      }

      // Preserve states
      if (currentStatus === 'movie_on_ott' && initialStatus === 'movie_unwatched') {
          initialStatus = 'movie_on_ott';
          movedToLibrary = false;
      }
      if (currentStatus === 'movie_watched') {
          initialStatus = 'movie_watched';
          movedToLibrary = true;
      }

  } else {
     // Show logic simplified (Shows don't usually move between libraries drastically based on auto-refresh alone except for 'New Episodes')
     // For this migration, we are largely preserving the status unless significantly changed.
     const lastEp = details.last_episode_to_air;
     if (!lastEp) {
         initialStatus = 'show_new';
         movedToLibrary = false;
     } else {
         if (!currentStatus) {
             const s = details.status;
             const isFinished = s === 'Ended' || s === 'Canceled';
             const isNew = s === 'Planned' || s === 'In Production';
             if (isNew) initialStatus = 'show_new';
             else if (isFinished) initialStatus = 'show_finished';
             else initialStatus = 'show_ongoing';
             movedToLibrary = (initialStatus !== 'show_new');
         } else {
             initialStatus = currentStatus;
             movedToLibrary = true;
         }
     }
  }

  // Prune Metadata (similar to frontend 'pruneMetadata')
  // We keep the payload small for the DB
  const { credits, production_companies, images, videos, reviews, ...leanDetails } = details;
  
  // Videos logic
  let leanVideos = details.videos;
  if (details.videos?.results) {
      const trailer = details.videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
      leanVideos = trailer ? { results: [trailer] } : { results: [] };
  }

  // Providers logic
  let leanProviders = {};
  if (details['watch/providers']?.results?.[region]) {
      leanProviders = { results: { [region]: details['watch/providers'].results[region] } };
  }

  const finalMetadata = {
      ...(existingMetadata || {}),
      ...leanDetails,
      // tvmaze_runtime skipped for now, can add extra fetch if needed
      digital_release_date: indianDigitalDate || (existingMetadata?.manual_date_override ? existingMetadata.digital_release_date : null),
      digital_release_note: indianDigitalDate ? indianDigitalNote : (existingMetadata?.manual_date_override ? existingMetadata.digital_release_note : null),
      theatrical_release_date: theatricalDate || existingMetadata?.theatrical_release_date,
      manual_date_override: indianDigitalDate ? false : !!existingMetadata?.manual_date_override,
      moved_to_library: movedToLibrary,
      last_updated_at: Date.now(),
      'watch/providers': leanProviders,
      videos: leanVideos
  };

  return { finalMetadata, initialStatus, movedToLibrary };
};


// --- Main Handler ---
Deno.serve(async (req) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing Env Vars" }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Fetch Candidates (Oldest updated items first)
  // We only fetch 10 at a time to stay within execution limits (Serverless has timeouts)
  // Prioritize active lists: Coming Soon, Ongoing, On OTT
  const { data: candidates, error } = await supabase
      .from('watchlist')
      .select('*')
      .in('status', ['movie_coming_soon', 'movie_on_ott', 'show_returning', 'show_ongoing'])
      .order('updated_at', { ascending: true }) // Oldest first (based on updated_at usually)
      // Actually we should look at metadata->last_updated_at if possible, but row updated_at is a good proxy
      .limit(5);

  if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const results = [];
  for (const item of candidates || []) {
      const region = 'IN'; // Default to IN for now, or fetch user preference if we had user context
      try {
          const { finalMetadata, initialStatus } = await processItem(item, region);
          
          // Update DB
          const { error: updateError } = await supabase
              .from('watchlist')
              .update({ 
                  metadata: finalMetadata,
                  status: initialStatus,
                  updated_at: new Date().toISOString()
              })
              .eq('id', item.id);

          results.push({ 
              id: item.id, 
              title: item.metadata?.title, 
              oldStatus: item.status, 
              newStatus: initialStatus, 
              success: !updateError 
          });
          
      } catch (err) {
          console.error(`Failed to process ${item.id}:`, err);
          results.push({ id: item.id, error: String(err) });
      }
  }

  return new Response(
    JSON.stringify({ message: "Refresh Complete", processed: results.length, details: results }),
    { headers: { "Content-Type": "application/json" } },
  )
})
