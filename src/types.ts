import type { TMDBMedia } from './lib/tmdb';

export type WatchStatus =
    | 'movie_watched' | 'movie_unwatched' | 'movie_dropped' | 'movie_on_ott' | 'movie_coming_soon'
    | 'show_finished' | 'show_ongoing' | 'show_watched' | 'show_watching' | 'show_returning' | 'show_new' | 'show_dropped';

export interface WatchlistItem {
    id: string; // database uuid
    tmdb_id: number;
    type: 'movie' | 'show';
    title: string;
    poster_path: string | null;
    vote_average: number;
    status: WatchStatus;
    metadata?: TMDBMedia;
    last_watched_season?: number;
    progress?: number;
    created_at?: string;
    updated_at?: string;
    user_id?: string;
}

export type GameStatus = 'backlog' | 'playing' | 'finished' | 'beaten' | 'dropped' | 'wishlist';

export interface Game {
    id: string; // database uuid (Supabase ID)
    igdb_id?: number; // Deprecated, keeping for type safety temporarily
    rawg_id: number; // New ID from RAWG
    title: string;
    cover_url: string | null;
    rating?: number;
    status: GameStatus;
    hours_played?: number;
    platform?: string[]; // e.g. ["PC", "PS5"]
    franchise_id?: string; // Link to a franchise
    release_date?: string;
    genres?: string[];
    franchise_data?: any[]; // Store series/related game IDs
    created_at?: string;
    updated_at?: string;
    user_id?: string;
}

export interface Franchise {
    id: string; // database uuid
    name: string;
    cover_url: string | null; // Representative image for the collection
    games: Game[]; // Populated on frontend usually, or separate query
}
