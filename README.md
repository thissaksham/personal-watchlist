# Personal Watchlist

A modern, private media library built with React, TypeScript, and Supabase. Organize your movie and TV show watchlist with advanced sorting, region-specific streaming info, and privacy-focused data storage.

![Project Banner](https://placehold.co/1200x400?text=Personal+Watchlist)

## 🚀 Features

*   **Smart Library**: Automatically sorts TV shows by "Binge Time" (Runtime × Episodes).
*   **Streaming Info**: Instantly see where to watch (Netflix, Prime, Hotstar, etc.) in your region using TMDB providers.
*   **Trending Feed**: A noise-free, curated list of weekly popular Movies & TV shows.
*   **Universal Search**: Integrated with TMDB API to find any title.
*   **Private & Secure**: All user data is stored in your personal Supabase instance with Row Level Security (RLS).
*   **Responsive Design**: Built with Tailwind CSS for mobile and desktop.

## 🛠️ Tech Stack

-   **Frontend**: React (Vite), TypeScript
-   **Styling**: Tailwind CSS
-   **Backend / Auth**: Supabase (Auth, Database, Realtime)
-   **Data Source**: The Movie Database (TMDB) API
-   **Routing**: React Router DOM v6
-   **Deployment**: Vercel

## 📂 Project Structure

```bash
src/
├── components/     # Reusable UI components (Layout, Cards, Navbar)
├── context/        # Global state management
│   ├── AuthContext.tsx       # Handles User Authentication (Supabase)
│   └── WatchlistContext.tsx  # Manages user's watchlist state
├── hooks/          # Custom React hooks
├── lib/            # External service configurations
│   ├── supabase.ts # Supabase client initialization
│   ├── tmdb.ts     # TMDB API fetch functions and types
│   └── mockData.ts # Fallback data for development
├── pages/          # Route components (Pages)
│   ├── Login.tsx
│   ├── Trending.tsx
│   ├── Movies.tsx
│   └── ...
├── App.tsx         # Main entry, Routing logic, Providers setup
└── main.tsx        # React Root
```

## 🔄 Application Flow

1.  **Authentication**:
    -   Users log in via `AuthContext` using Supabase Magic Link or OAuth.
    -   `ProtectedRoute` component guards access to the main app, redirecting unauthenticated users to `/auth`.

2.  **Data Fetching**:
    -   **TMDB Content**: `lib/tmdb.ts` fetches trending items, search results, and details directly from TMDB API.
    -   **User Data**: `WatchlistContext` loads the user's saved items from Supabase `watchlist` table on mount.

3.  **State Management**:
    -   `AuthContext`: Exposes `user`, `role`, and `signOut`.
    -   `WatchlistContext`: Syncs local state with Supabase Realtime, offering instant UI updates when items are added/removed.

## 🗄️ Database Schema

The project uses a single primary table `watchlist` in Supabase.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` | Primary Key |
| `user_id` | `uuid` | FK to `auth.users` (RLS Owner) |
| `tmdb_id` | `int` | ID from TMDB |
| `type` | `varchar` | `movie` or `show` |
| `title` | `varchar` | Title of the media |
| `poster_path` | `varchar` | TMDB image path |
| `vote_average`| `decimal`| Rating |
| `status` | `varchar` | `plan_to_watch` (default), `watched`, `dropped` |
| `metadata` | `jsonb` | Full TMDB object cache |
| `created_at` | `timestamp`| Record creation time |

**Security**: RLS (Row Level Security) is enabled. Users can only CRUD (Create, Read, Update, Delete) rows where `user_id` matches their authenticated ID.

## ⚡ Setup & Installation

### Prerequisites
-   Node.js (v16+)
-   Supabase Account
-   TMDB API Key

### Steps

1.  **Clone the repository**
    ```bash
    git clone https://github.com/thissaksham/personal-watchlist.git
    cd personal-watchlist
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_TMDB_API_KEY=your_tmdb_api_key
    ```

4.  **Database Setup**
    Run the SQL commands found in `supabase_schema.sql` in your Supabase SQL Editor to create the table and policies.

5.  **Run Locally**
    ```bash
    npm run dev
    ```

## 🚀 Deployment

**Vercel** is recommended:
1.  Import repo to Vercel.
2.  Add Environment Variables from your `.env` file.
3.  Deploy!

> **Note**: Ensure your Supabase **Site URL** and **Redirect URLs** are configured to match your Vercel deployment domain for auth to work correctly.
