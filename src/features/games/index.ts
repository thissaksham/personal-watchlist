/**
 * Games Feature Module
 * Game library management.
 */

// Pages
export { GamesPage } from './pages/GamesPage';

// Components
export { GameCard } from './components/GameCard';
export { GameDiscoveryCard } from './components/GameDiscoveryCard';
export { FranchiseCard } from './components/FranchiseCard';
export { FranchiseOverlay } from './components/FranchiseOverlay';
export * from './components/PlatformIcons';
export { PlatformSelector } from './components/PlatformSelector';

// Hooks
export { useGameSearch, useFranchiseCollection } from './hooks/useGames';
export { useGameLibrary } from './hooks/useGameLibrary';

// Constants
export * from './constants/platformData';
