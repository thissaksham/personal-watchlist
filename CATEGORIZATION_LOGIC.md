# Movie Categorization Logic

This document outlines the 5-step logic used to categorize movies in the Personal Watchlist application. This logic is applied during initial search addition and background synchronization.

## Scenarios & Lifecycle

The logic is "context-aware" and behaves differently depending on whether a movie is being added for the first time or refreshed in the background.

### Scenario 1: Adding from Search
1. **Streaming in India?** (Netflix, Hotstar, etc.) ➡️ **Library (Unwatched)**
2. **Indian OTT Release Date?** (Official TMDB India Date) ➡️ **Upcoming (On OTT)**
3. **No local info?** Check Global:
   - **Older than 6 months AND streaming anywhere in the world?** ➡️ **Library (Unwatched)**
   - **Older than 1 year?** ➡️ **Library (Unwatched)**
4. **Default?** ➡️ **Upcoming (Coming Soon)**

### Scenario 2: Refreshing "Coming Soon"
1. **Found India OTT?** (Past, Present, or Future official data) ➡️ **Move to On OTT**
   - *Note: Unlike Scenario 1, this moves to On OTT instead of Library to keep the update visible to the user.*
2. **Age Fallbacks?**
   - **Older than 6 months AND streaming anywhere in the world?** ➡️ **Library (Unwatched)**
   - **Older than 1 year?** ➡️ **Library (Unwatched)**
3. **Else?** Stay in **Coming Soon**.

### Scenario 3: Refreshing "On OTT" (Sticky Mode)
1. **Sticky Protection**: Items already in `movie_on_ott` will **NEVER** move to the Library automatically via background sync.
2. **Official Sync**: 
   - If an **Official Indian Digital Date** appears on TMDB, it overwrites any Manual Override to ensure data accuracy.
   - If no official data is found, the **Manual Override** remains the source of truth for display.
3. **Exit Condition**: Items only leave this state when the user manually clicks "Move to Library", marks as "Watched", or deletes.

---

## Technical Flow (The 5 Steps)

### Step 1: High Priority - Local Streaming 🇮🇳
Check for any flatrate, ad-supported, free, rent, or buy providers in the **Indian (IN)** region on TMDB.
- **Add Flow**: ➡️ Library.
- **Refresh Flow**: ➡️ On OTT.

### Step 2: Local OTT Confirm 📅
Look for a Digital Release Date (`type: 4`) specifically for region `IN`. 
- **Add Flow**: Uses official TMDB India data only.
- **Refresh Flow**: Official Indian data overwrites manual entries. Manual entries serve as the fallback if official info is missing.

### Step 3: Global Release Cleanup 🌏
If a movie is theatrical-only in India but has been streaming elsewhere in the world for **more than 6 months**.
- ➡️ Library.

### Step 4: Archive Fallback 🕰️
If a movie was released theatrically **more than 1 year ago**.
- ➡️ Library.

### Step 5: Default State 🍿
New releases with no confirmed digital data.
- ➡️ Coming Soon.
