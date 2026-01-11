/**
 * Lib Module
 * Core libraries, API clients, and utilities.
 */

// API Clients
export { supabase } from './api/supabase';
export { tmdb, REGIONS, calculateMediaRuntime } from './tmdb';
export type { TMDBMedia, WatchProvider, Video } from './tmdb';
export { fetchWatchmodeDetails } from './watchmode';

// Utilities
export * from './dateUtils';
export * from './urls';

// React Query
export { queryClient } from './react-query/client';
