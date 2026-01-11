/**
 * Upcoming Feature Module
 * Upcoming releases and calendar functionality.
 */

// Pages
export { UpcomingPage } from './pages/UpcomingPage';

// Hooks
export { 
  useUpcomingItems, 
  getDaysUntil, 
  processUpcomingItem 
} from './hooks/useUpcomingItems';

// Types
export type { UpcomingItem } from './hooks/useUpcomingItems';
