# TV Show Categorization Logic (V3)

This document outlines the finalized logic for TV show categorization, status derivation, and UI display in the Personal Watchlist application. This reflects the "Linear Progress" model where a show's progress is tracked by a single `last_watched_season` integer.

## 1. Core Statuses

The application uses 6 explicit statuses for TV shows, stored in the `status` column of the `watchlist` table:

1.  **`show_new`** (Previously `show_coming_soon`):
    *   **Definition:** A show that has been announced but has **zero** aired episodes.
    *   **Database:** `status = 'show_new'`, `last_watched_season = 0`.
    *   **Location:** **Upcoming (On OTT)**.

2.  **`show_returning`**:
    *   **Definition:** A show where the user has caught up to the *end* of a season (e.g., S1 watched, S2 released but not started; OR S1 watched, no S2 yet). Essentially, whenever `last_watched_season` is a complete season boundary, even if future seasons are available.
    *   **Database:** `show_returning` when `last_watched_season > 0` AND (`last_watched_season < totalSeasons` OR `next_ep` exists).
    *   **Location:** **Library (Watched)** AND **Upcoming (On OTT)**.

3.  **`show_watching`** (Previously `watching`):
    *   **Definition:** A show where the user is "mid-season" or actively watching the latest season (e.g., S2 is released, user is caught up to S2 Ep 5, but Ep 6 is out).
    *   **Database:** `status = 'show_watching'`, typically when catching up to an **ongoing season**.
    *   **Location:** **Library (Watching)**.

4.  **`show_watched`** (Previously `watched`):
    *   **Definition:** A show where the user has watched **all aired content** AND the show status is "Ended" or "Canceled" (no future content expected).
    *   **Database:** `status = 'show_watched'`, `last_watched_season = <max_aired_seasons>`.
    *   **Location:** **Library (Watched)**.

5.  **`show_ongoing`** (Derived/UI State):
    *   **Definition:** Similar to `show_returning` but often used for active seasons where the user is caught up week-to-week.
    *   **Mapping:** Often maps to `show_watching` or `show_returning` depending on if the very next episode is in the future.

6.  **`show_finished`** (Derived/UI State):
    *   **Definition:** Legacy alias/equivalent for `show_watched`.

---

## 2. Linear Progress Model

Status is **derived** mainly from the relationship between `last_watched_season` and the show's metadata (`number_of_seasons`, `next_episode_to_air`).

### Calculation Logic (`recalculateShowStatus`)

*   **Inputs:** `lastWatchedSeason`, `totalSeasons`, `nextEpisodeToAir`, `showStatus` (from TMDB: Returning, Ended, etc.).
*   **Logic:**
    1.  If `totalSeasons == 0` (or no aired eps): ➡️ `show_new`.
    2.  If `lastWatchedSeason < totalSeasons`: ➡️ `show_returning` (Between Seasons).
    3.  If `lastWatchedSeason == totalSeasons`:
        *   If `nextEpisodeToAir` exists (future content):
            *   If `nextEp.season == lastWatchedSeason`: ➡️ `show_watching` (Ongoing Season Catch-up).
            *   Else: ➡️ `show_returning` (Between Seasons).
        *   Else: ➡️ `show_watched`.

---

## 3. Upcoming Episode Naming Conventions

For items appearing in the **Upcoming** section (typically `show_new` or `show_returning`), the UI displays specific labels based on the **next episode to air**:

| Scenario | Label Text | Logic Condition |
| :--- | :--- | :--- |
| **Final Season Premiere** | **"Final Season"** | Next Ep is #1 AND Season Name contains "Final". |
| **Series Finale** | **"Final Episode"** | Next Ep is last of the season AND Season Name contains "Final". |
| **Season Premiere** | **"New Season"** | Next Ep is #1 (and not final). |
| **Season Finale** | **"Last Episode"** | Next Ep is last of the season (and not final). |
| **Mid-Season Episode** | **"New Episode"** | All other cases (Ep > 1, not last). |

### Heuristics
*   **"Final" Detection:** Checks if the `name` of the current season (e.g., "Season 5: The Final Season") contains the case-insensitive string "final".
*   **"Last Episode" Detection:** Checks if `next_episode.episode_number == season.episode_count`.

---

## 4. UI Visibility Matrix

| Status | Library Tab | Upcoming View |
| :--- | :--- | :--- |
| `show_new` | - | **Visible** |
| `show_returning` | **Watched** | **Visible** |
| `show_watching` | **Watching** | **Visible** (if future ep exists) |
| `show_watched` | **Watched** | - |
