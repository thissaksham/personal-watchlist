# CineTrack Architecture

This document describes the architecture and folder structure of the CineTrack application after the restructuring.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for bundling and development
- **TanStack Query (React Query)** for data fetching and caching
- **Supabase** for authentication and database
- **TMDB API** for movie/TV metadata
- **RAWG API** for game metadata

## Folder Structure

```
src/
├── app/                    # Application core (routing, providers)
│   ├── providers/          # Context providers wrapper
│   │   ├── AppProviders.tsx
│   │   └── index.ts
│   ├── routes/             # Route configuration
│   │   ├── ProtectedRoute.tsx
│   │   └── index.ts
│   ├── Router.tsx          # Main router configuration
│   └── index.ts
│
├── context/                # Global contexts (non-feature specific)
│   ├── GlobalSearchContext.tsx
│   ├── PreferencesContext.tsx
│   └── index.ts
│
├── constants/              # Application constants
│   ├── routes.ts
│   ├── status.ts
│   ├── theme.ts
│   └── index.ts
│
├── features/               # Feature-based modules
│   ├── auth/               # Authentication feature
│   │   ├── components/
│   │   ├── context/
│   │   └── index.ts
│   │
│   ├── games/              # Games library feature
│   │   ├── components/
│   │   ├── constants/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── index.ts
│   │
│   ├── header/             # Header/Layout feature
│   │   ├── components/
│   │   ├── Layout.tsx
│   │   └── index.ts
│   │
│   ├── media/              # Shared media hooks
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── movies/             # Movies feature
│   │   ├── components/
│   │   ├── pages/
│   │   └── index.ts
│   │
│   ├── search/             # Search functionality
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   │
│   ├── shows/              # TV Shows feature
│   │   ├── components/
│   │   ├── pages/
│   │   └── index.ts
│   │
│   ├── upcoming/           # Upcoming releases
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── index.ts
│   │
│   ├── watchlist/          # Watchlist management
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── index.ts
│   │
│   └── index.ts            # Feature barrel exports
│
├── hooks/                  # Reusable React hooks
│   ├── useDocumentTitle.ts
│   ├── useLocalStorage.ts
│   ├── useMediaQuery.ts
│   ├── useModal.ts
│   └── index.ts
│
├── lib/                    # Core libraries and API clients
│   ├── api/                # API client configurations
│   │   ├── supabase.ts
│   │   └── index.ts
│   ├── react-query/        # React Query configuration
│   │   └── client.ts
│   ├── dateUtils.ts
│   ├── supabase.ts         # (deprecated, use lib/api/supabase)
│   ├── tmdb.ts
│   ├── urls.ts
│   ├── watchlist-shared.ts
│   ├── watchmode.ts
│   └── index.ts
│
├── pages/                  # Standalone pages (auth, etc.)
│   ├── Login.tsx
│   └── VerifySuccess.tsx
│
├── shared/                 # Shared/reusable components
│   ├── components/
│   │   ├── cards/          # Card components
│   │   ├── feedback/       # Error boundaries, loaders
│   │   ├── modals/         # Modal components
│   │   └── ui/             # UI primitives (buttons, etc.)
│   ├── pages/              # Shared page templates
│   │   └── LibraryPage.tsx
│   └── index.ts
│
├── styles/                 # Global styles
│   ├── base/               # Reset, variables, typography
│   ├── components/         # Component CSS modules
│   ├── pages/              # Page-specific styles
│   └── utilities/          # Animation, helper utilities
│
├── types/                  # TypeScript type definitions
│   ├── games.ts
│   ├── media.ts
│   ├── watchlist.ts
│   └── index.ts
│
├── utils/                  # Utility functions
│   ├── cn.ts               # Class name helper
│   ├── domUtils.ts
│   ├── formatting.ts
│   ├── imageUtils.ts
│   ├── mediaHelpers.ts
│   ├── mediaUtils.ts
│   ├── validation.ts
│   └── index.ts
│
├── App.tsx                 # Root app component
├── main.tsx                # Entry point
├── index.css               # Global CSS
└── types.ts                # (deprecated, use types/)
```

## Key Architectural Decisions

### 1. Feature-Based Structure
Each feature (movies, shows, games, etc.) is self-contained with its own:
- Components
- Hooks
- Pages
- Constants
- Barrel exports (`index.ts`)

### 2. Shared Components
Common UI components live in `src/shared/` and are organized by type:
- `cards/` - Card components for displaying media
- `modals/` - Modal dialogs
- `ui/` - UI primitives (buttons, toggles)
- `feedback/` - Loading states, error boundaries

### 3. Type Organization
Types are centralized in `src/types/` with separate files for:
- `media.ts` - TMDB media types
- `watchlist.ts` - Watchlist item types
- `games.ts` - Game-related types

### 4. App Layer
The `src/app/` folder contains application-level concerns:
- Provider composition
- Route configuration
- Protected route logic

### 5. Path Aliases
The project uses path aliases for cleaner imports:
- `@/*` → `./src/*`

## Import Guidelines

### Prefer Barrel Exports
```typescript
// Good - import from barrel
import { useWatchlist, WatchlistProvider } from '@/features/watchlist';

// Avoid - deep imports
import { useWatchlist } from '@/features/watchlist/context/WatchlistContext';
```

### Type-Only Imports
```typescript
// Good
import type { TMDBMedia, WatchlistItem } from '@/types';

// Avoid
import { TMDBMedia, WatchlistItem } from '@/types';
```

## State Management

- **React Query** for server state (API data)
- **React Context** for global UI state (auth, preferences, watchlist)
- **Local state** for component-specific UI state

## Styling

- CSS Modules for component-specific styles
- Global CSS variables in `styles/base/variables.css`
- Utility classes in `styles/utilities/`
