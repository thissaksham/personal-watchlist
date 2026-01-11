/**
 * API Module
 * Centralized exports for API clients.
 */

export { supabase } from './supabase';

// Re-export from existing files for backwards compatibility
export { tmdb, REGIONS, calculateMediaRuntime } from '../tmdb';
export type { TMDBMedia, WatchProvider, Video } from '../tmdb';
export { fetchWatchmodeDetails } from '../watchmode';
