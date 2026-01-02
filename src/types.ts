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
