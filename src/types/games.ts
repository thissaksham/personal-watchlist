/**
 * Games Types
 * Type definitions for games and game-related entities.
 */

// Game status types
export type GameStatus =
  | 'backlog'
  | 'playing'
  | 'finished'
  | 'beaten'
  | 'dropped'
  | 'wishlist';

/**
 * Game - A game in the user's library
 */
export interface Game {
  /** Database UUID (Supabase ID) */
  id: string;
  /** IGDB ID (deprecated) */
  igdb_id?: number;
  /** RAWG ID */
  rawg_id: number;
  /** Game title */
  title: string;
  /** Cover image URL */
  cover_url: string | null;
  /** User rating */
  rating?: number;
  /** Current status */
  status: GameStatus;
  /** Hours played */
  hours_played?: number;
  /** Platforms (e.g., ["PC", "PS5"]) */
  platform?: string[];
  /** Link to a franchise */
  franchise_id?: string;
  /** Release date */
  release_date?: string;
  /** Game genres */
  genres?: string[];
  /** Related games/series data */
  franchise_data?: { id: number; title: string }[];
  /** Creation timestamp */
  created_at?: string;
  /** Last update timestamp */
  updated_at?: string;
  /** User ID */
  user_id?: string;
}

/**
 * Franchise - A game franchise/series
 */
export interface Franchise {
  /** Database UUID */
  id: string;
  /** Franchise name */
  name: string;
  /** Representative image */
  cover_url: string | null;
  /** Games in the franchise */
  games: Game[];
}
