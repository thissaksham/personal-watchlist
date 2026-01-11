/**
 * Watchlist Types
 * Type definitions for watchlist items and statuses.
 */

import type { TMDBMedia } from './media';

// Movie status types
export type MovieStatus =
  | 'movie_watched'
  | 'movie_unwatched'
  | 'movie_dropped'
  | 'movie_on_ott'
  | 'movie_coming_soon';

// Show status types
export type ShowStatus =
  | 'show_finished'
  | 'show_ongoing'
  | 'show_watched'
  | 'show_watching'
  | 'show_returning'
  | 'show_new'
  | 'show_dropped';

// Combined status type
export type WatchStatus = MovieStatus | ShowStatus;

// Media type
export type MediaType = 'movie' | 'show';

/**
 * WatchlistItem - A media item in the user's watchlist
 */
export interface WatchlistItem {
  /** Database UUID */
  id: string;
  /** TMDB ID for the media */
  tmdb_id: number;
  /** Type of media */
  type: MediaType;
  /** Title of the media */
  title: string;
  /** Poster image path */
  poster_path: string | null;
  /** Average rating */
  vote_average: number;
  /** Current status */
  status: WatchStatus;
  /** Full TMDB metadata */
  metadata?: TMDBMedia;
  /** Last watched season (for shows) */
  last_watched_season?: number;
  /** Watch progress percentage */
  progress?: number;
  /** Creation timestamp */
  created_at?: string;
  /** Last update timestamp */
  updated_at?: string;
  /** User ID */
  user_id?: string;
}
