
// Simple script to fetch release dates for the specific movie (ESM JS Version)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEnv() {
    try {
        const envPath = path.join(__dirname, '.env');
        const env = fs.readFileSync(envPath, 'utf8');
        const match = env.match(/VITE_TMDB_API_KEY=(.+)/);
        if (match) return match[1].trim();
    } catch (e) {
        return null;
    }
    return null;
}

const API_KEY = getEnv();

if (!API_KEY) {
    console.error("Could not find VITE_TMDB_API_KEY in .env file.");
    process.exit(1);
}

const BASE_URL = 'https://api.themoviedb.org/3';

async function fetchTMDB(endpoint) {
    const url = `${BASE_URL}${endpoint}?api_key=${API_KEY}`;
    // console.log(`Fetching: ${url.replace(API_KEY, 'HIDDEN')}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB Error: ${res.status}`);
    return res.json();
}

async function debugDates() {
    const MOVIE_ID = 1215020;
    console.log(`Fetching release dates for Movie ID: ${MOVIE_ID}...`);

    try {
        const data = await fetchTMDB(`/movie/${MOVIE_ID}/release_dates`);
        const results = data.results || [];
        console.log(`\nFound entries for ${results.length} countries.`);

        let foundAny = false;

        // Print all relevant dates
        for (const res of results) {
            if (!res.release_dates) continue;
            for (const d of res.release_dates) {
                if ([1, 2, 3].includes(d.type)) {
                    console.log(`[${res.iso_3166_1}] Date: ${d.release_date}, Type: ${d.type}`);
                    foundAny = true;
                }
            }
        }

        if (!foundAny) {
            console.log("No Premiere (1), Limited (2), or Theatrical (3) dates found!");
        }

        console.log("\n--- Applying Logic ---");
        let earliestDate = null;
        for (const res of results) {
            if (!res.release_dates) continue;
            for (const d of res.release_dates) {
                if ([1, 2, 3].includes(d.type)) {
                    if (d.release_date) {
                        if (!earliestDate || d.release_date < earliestDate) {
                            earliestDate = d.release_date;
                        }
                    }
                }
            }
        }
        console.log(`Calculated Earliest Global Date: ${earliestDate}`);

    } catch (e) {
        console.error("Error:", e);
    }
}

debugDates();
