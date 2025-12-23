# Master Categorization Logic

> **Goal**: This document serves as the **Single Source of Truth** for how media is categorized, synchronized, and displayed in the Personal Watchlist application. It is designed to be understood without prior knowledge of the codebase.

---

## 🏗️ Core Concept: The Two Main Buckets

Everything in the app lives in one of two main "buckets" based on its **Status**:

1.  **Upcoming (On OTT / Coming Soon)**:
    *   Content that is **not yet available** for you *personally* to watch (e.g., releasing in theaters, waiting for digital release, or a future TV season).
    *   *Key Statuses:* `movie_coming_soon`, `movie_on_ott`, `show_new`, `show_returning`.

2.  **Library (To Watch / Watched)**:
    *   Content that is **available now** or **already watched**.
    *   *Key Statuses:* `movie_unwatched`, `movie_watched`, `show_watching`, `show_watched`.

---

## 🎬 Part 1: Movies Logic

Movies follow a strict **5-Step Flow** that determines where they land. This logic runs twice:
1.  **Initial Add**: When you first add a movie from Search.
2.  **Background Refresh**: When the system checks for updates (e.g., a movie becoming available).

### The 5 Checks (In Order of Priority)

| Priority | Check | Condition | Resulting Status | Location |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Streaming in India?** 🇮🇳 | Is it on Netflix, Prime, Hotstar, etc. *in India*? | `movie_on_ott`* | **Upcoming (On OTT)** |
| **2** | **Digital Date India?** 📅 | Is there an official *future* digital release date for India? | `movie_on_ott` | **Upcoming (On OTT)** |
| **3** | **Global Release?** 🌏 | Is it >6 months old **AND** available digitally in US/UK/Global? | `movie_unwatched` | **Library (To Watch)** |
| **4** | **Old Movie?** 🕰️ | Is the release date > 1 year ago? | `movie_unwatched` | **Library (To Watch)** |
| **5** | **Default Fallback** 🍿 | None of the above? | `movie_coming_soon` | **Upcoming (Coming Soon)** |

> \* **Note on Status 1**: If you are adding it for the *first* time and it's already streaming, it goes straight to **Library** (`movie_unwatched`). If it *becomes* available later (Refresh), it goes to **Upcoming** (`movie_on_ott`) so you are notified.

### 🔄 The Refresh Scenarios (What happens automatically?)

When the system checks a movie in "Coming Soon":

1.  **Scenario A: It hits Indian OTT** (e.g., Netflix adds it today).
    *   **Result**: Moves to **Upcoming (On OTT)**.
    *   *User Value:* "Hey, you can watch this now in India!"
2.  **Scenario B: It releases Globally** (e.g., Out on VOD in the US, but not India yet).
    *   **Result**: If 6 months have passed, moves to **Library (To Watch)**.
    *   *User Value:* "It's been out a while globally, you can probably find it."
3.  **Scenario C: It gets Old** (1 year passed).
    *   **Result**: Moves to **Library (To Watch)**.
    *   *User Value:* "Catalog title."

### 📌 Sticky "On OTT" Mode
Once a movie enters **`movie_on_ott`** (Upcoming), it **STAYS THERE**.
*   It will **NEVER** automatically move to the Library.
*   **Why?** To prevent you from missing a release. You must manually click "Move to Library" or "Mark as Watched" when you are ready.

---

## 📺 Part 2: TV Shows Logic (Linear Progress)

TV Shows are complex because they have seasons and episodes. The app uses a **Linear Progress Model** tracked by a single number: `last_watched_season`.

### The 6 TV Statuses

| Status | Meaning | Location |
| :--- | :--- | :--- |
| **`show_new`** | Announced, but **0 episodes** have aired. | **Upcoming** |
| **`show_returning`** | You are **caught up** between seasons (e.g., Watched S1, S2 coming soon). | **Upcoming** (+ Library) |
| **`show_watching`** | You are **mid-season** (e.g., Watched S1, currently on S2 Ep 3). | **Library (Watching)** |
| **`show_watched`** | You have watched **everything** available & show has Ended. | **Library (Watched)** |
| **`show_ongoing`** | *Internal*: Active season is airing weekly. | *Maps to Watching/Returning* |
| **`show_finished`** | *Legacy*: Same as `show_watched`. | *Maps to Watched* |

### 🧠 Logic: "How do I know the status?"

The specific logic function (`recalculateShowStatus`) runs these checks:

1.  **Has it started?**
    *   If `last_watched_season == 0`: It's **`show_new`**.
2.  **Are you mid-way?**
    *   If `last_watched_season < total_released_seasons`: It's **`show_returning`** (You have unwatched seasons).
3.  **Are you caught up?**
    *   If `last_watched_season == total_released_seasons`:
        *   Is there a **Next Episode** scheduled?
            *   Yes, and it's in the *current* season? ➡️ **`show_watching`** (Weekly catch-up).
            *   Yes, and it's in a *future* season? ➡️ **`show_returning`** (Waiting for premiere).
        *   No future content? ➡️ **`show_watched`**.

### 🏷️ Upcoming Labels
When a show appears in **Upcoming**, we give it a precise label:

*   **"Final Season"**: The very last season is premiering.
*   **"New Season"**: A standard new season is premiering.
*   **"Final Episode"**: The Series Finale is airing.
*   **"New Episode"**: A standard weekly episode.

---

## ⚡ Summary of "Zero Context" Rules

1.  **India First**: If it's available in India, we highlight it in **Upcoming**.
2.  **Global Fallback**: If it's old and out globally, we dump it in **Library** (assuming you can acquire it).
3.  **Tv Shows**: Tracks *Seasons*. If you finish S1 and S2 enters, it pops back into **Upcoming**.
