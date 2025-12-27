
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
const BASE_URL = 'https://api.themoviedb.org/3';

async function fetchTMDB(endpoint) {
    const url = `${BASE_URL}${endpoint}&api_key=${API_KEY}`;
    console.log(`Fetching: ${url.replace(API_KEY, 'HIDDEN')}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB Error: ${res.status}`);
    return res.json();
}

async function debugSearch() {
    console.log(`Searching for "Hero"...`);

    try {
        // Exact query used in app: /search/movie?query=Hero
        const data = await fetchTMDB(`/search/movie?query=Hero`);
        const results = data.results || [];
        console.log(`\nFound ${results.length} results.`);

        console.log("\n--- Suspect Entries (No Poster) ---");
        const suspects = results.filter(m => !m.poster_path);

        if (suspects.length === 0) {
            console.log("Strange... ALL results have poster paths in the raw API response.");
        } else {
            suspects.forEach(m => {
                console.log(`ID: ${m.id} | Title: "${m.title}" | Release: ${m.release_date} | Vote: ${m.vote_average}`);
                console.log(`Link: https://www.themoviedb.org/movie/${m.id}`);
            });
        }

        console.log("\n--- First 3 Valid Entries ---");
        results.slice(0, 3).forEach(m => {
            console.log(`[${m.id}] ${m.title} (${m.release_date}) - Poster: ${m.poster_path}`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

debugSearch();
