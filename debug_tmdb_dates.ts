
import { tmdb } from './src/lib/tmdb';

// Simple script to fetch release dates for the specific movie
async function debugDates() {
    const MOVIE_ID = 1215020;
    console.log(`Fetching release dates for Movie ID: ${MOVIE_ID}...`);

    try {
        const data = await tmdb.getReleaseDates(MOVIE_ID);
        console.log("Raw Release Date Data:");
        console.log(JSON.stringify(data, null, 2));

        // Simulate the logic
        const results = data.results || [];
        console.log(`\nFound entries for ${results.length} countries.`);

        let earliestDate = null;
        let earliestType = null;
        let earliestCountry = null;

        for (const res of results) {
            if (!res.release_dates || !Array.isArray(res.release_dates)) continue;

            for (const d of res.release_dates) {
                // Check for Premiere (1), Limited (2), or Theatrical (3)
                if (d.type === 1 || d.type === 2 || d.type === 3) {
                    console.log(`Found candidate: ${d.release_date} (Type: ${d.type}) in ${res.iso_3166_1}`);
                    if (d.release_date) {
                        if (!earliestDate || d.release_date < earliestDate) {
                            earliestDate = d.release_date;
                            earliestType = d.type;
                            earliestCountry = res.iso_3166_1;
                        }
                    }
                }
            }
        }

        console.log("\n--- Logic Result ---");
        console.log(`Earliest Date Selected: ${earliestDate}`);
        console.log(`Type: ${earliestType}`);
        console.log(`Country: ${earliestCountry}`);

    } catch (e) {
        console.error("Error fetching dates:", e);
    }
}

debugDates();
