# Movie Categorization Logic

This document outlines the strict logic used to categorize movies into **Library (Unwatched)**, **Upcoming (On OTT)**, or **Upcoming (Coming Soon)** when added to the watchlist.

## The 5-Step Flow

The logic is applied in this specific order. The first condition that is met determines the status.

### 1. Check for India Streaming/Rental
*   **Condition:** Does the movie have providers (Stream, Rent, or Buy) anywhere in India?
*   **Result:** `unwatched` (Moves to Library)
*   **Reasoning:** You can watch it right now.

### 2. Check for Future Digital Release (India)
*   **Condition:** Does the movie have a confirmed **Digital Release Date** in India that is in the **future**?
*   **Result:** `movie_on_ott` (Moves to Upcoming -> On OTT tab)
*   **Reasoning:** It's coming to streaming soon.

### 3. Global Availability Check (> 6 Months Old)
*   **Condition:** Is the movie released more than **6 months ago** AND available to stream/rent **anywhere in the world** (even if not in India)?
*   **Result:** `unwatched` (Moves to Library)
*   **Reasoning:** If it's out digitally elsewhere, it's likely available to watch via other means.

### 4. Legacy/Old Movie Fallback (> 1 Year Old)
*   **Condition:** Is the movie released more than **1 year ago**?
*   **Result:** `unwatched` (Moves to Library)
*   **Reasoning:** Even if TMDB has no data, a movie this old is assumed to be available on disk or digital somewhere.

### 5. Final Fallback (Coming Soon)
*   **Condition:** None of the above.
*   **Result:** `movie_coming_soon` (Moves to Upcoming -> Coming Soon tab)
*   **Reasoning:** It is likely still in theaters, unreleased, or a very new release with no digital info yet.

---

## Display Logic (Strict)

The UI filters solely based on the status determined above:

*   **Library (Unwatched):** Shows items with status `unwatched`.
*   **Library (Watched):** Shows items with status `watched`.
*   **Upcoming (On OTT):** Shows items with status `movie_on_ott` (and all TV Shows).
*   **Upcoming (Coming Soon):** Shows items with status `movie_coming_soon`.
