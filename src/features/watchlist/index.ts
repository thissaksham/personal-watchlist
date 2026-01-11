/**
 * Watchlist Feature Module
 * User's watchlist management for movies and shows.
 */

// Context
export { WatchlistProvider, useWatchlist } from './context/WatchlistContext';

// Hooks
export { useWatchlistData } from './hooks/useWatchlistData';
export { useWatchlistMutations } from './hooks/useWatchlistMutations';

// Utils
export * from './utils/watchlistLogic';
export * from './utils/watchlistUtils';
