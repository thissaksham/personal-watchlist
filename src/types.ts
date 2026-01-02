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
    created_at?: string;
    updated_at?: string;
    user_id?: string;
}

export type GameStatus = 'backlog' | 'playing' | 'finished' | 'dropped' | 'wishlist';

export interface Game {
    id: string; // database uuid
    igdb_id: number;
    title: string;
    cover_url: string | null;
    rating?: number;
    status: GameStatus;
    hours_played?: number;
    platform?: string[]; // e.g. ["PC", "PS5"]
    franchise_id?: string; // Link to a franchise
    release_date?: string;
    genres?: string[];
}

export interface Franchise {
    id: string; // database uuid
    name: string;
    cover_url: string | null; // Representative image for the collection
    games: Game[]; // Populated on frontend usually, or separate query
}
