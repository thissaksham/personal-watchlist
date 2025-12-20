# Personal Watchlist

A modern, private media library built with React, TypeScript, and Supabase.

**Features:**
*   **Smart Library:** Automatically sorts TV shows by "Binge Time" (Runtime × Episodes).
*   **Streaming Info:** Instantly see where to watch (Netflix, Prime, Hotstar, etc.) in your region.
*   **Trending Feed:** A noise-free, weekly top 20 list of what's popular (Movies & TV mixed).
*   **Universal Search:** Find any movie or show via TMDB API.
*   **Privacy Focused:** Your data lives in your own Supabase instance.

---

## 🚀 How to Host for Free (Vercel)

The easiest way to host this project for free is using **Vercel**.

1.  **Create a Vercel Account**: Go to [vercel.com/signup](https://vercel.com/signup) and log in with GitHub.
2.  **Import Project**:
    *   Click **"Add New..."** -> **"Project"**.
    *   Select your `personal-watchlist` repository from the list.
3.  **Configure Environment Variables** (Critical!):
    *   In the "Deploy" screen, find the "Environment Variables" section.
    *   Add the keys from your `.env.local` file:
        *   `VITE_TMDB_API_KEY`: (Your TMDB Key)
        *   `VITE_SUPABASE_URL`: (Your Supabase URL)
        *   `VITE_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
4.  **Deploy**: Click **"Deploy"**.

Vercel will build your site and give you a live URL (e.g., `https://personal-watchlist.vercel.app`).

### Note on Routing
A `vercel.json` file has been added to ensure that refreshing pages like `/movies` or `/watched` works correctly.

---

## ⚙️ Supabase Configuration (Redirect Fix)

If your confirmation emails are pointing to `localhost:3000` instead of `5173`, follow these steps:

1.  Open your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Go to **Authentication** -> **URL Configuration**.
3.  Update **Site URL** to your Vercel URL (e.g., `https://your-app.vercel.app`).
4.  Add `http://localhost:5173/**` to **Redirect URLs** (so local development still works).
5.  Add your Vercel URL with a wildcard (e.g., `https://your-app.vercel.app/**`) to **Redirect URLs**.

> [!TIP]
> The app now sends `window.location.origin` automatically, so as long as both URLs are in your Supabase whitelist, redirects will work seamlessly in both environments.

---

## 🛠️ Local Development

1.  Clone the repo:
    ```bash
    git clone https://github.com/thissaksham/personal-watchlist.git
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    *   Create a `.env` file based on `.env.example`.
4.  Run the dev server:
    ```bash
    npm run dev
    ```
