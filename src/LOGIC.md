# Movie Categorization & Sorting Logic

This document defines the Source of Truth for how movies are categorized into folders (`movie_unwatched`, `movie_on_ott`, `movie_coming_soon`) and how they behave during background refreshes.

## PlantUML Diagram

```plantuml
@startuml
!theme plain
title Movie Categorization & Sorting Logic

start
:Movie Added / Refreshed;

partition "1. Add New Movie Check (No currentStatus)" {
  if (**Is Streaming Now?**\n(Has Providers in your Region)) then (Yes)
    #LightBlue:Folder: movie_unwatched;
  elseif (**Has Future Digital Date?**\n(OR Manual Date Override)) then (Yes)
    #Orange:Folder: movie_on_ott;
  elseif (**Is Old / Released Globally?**\n(Released > 1 year ago or 6mo+ global)) then (Yes)
    #LightBlue:Folder: movie_unwatched;
  else (No)
    #LightGreen:Folder: movie_coming_soon;
  endif
}

partition "2. Refresh Logic Check (Has currentStatus)" {
  if (**Is Streaming Now?**\n(Has Providers in your Region)) then (Yes)
    if (Current Status is **movie_coming_soon**) then (Yes)
        #Orange:Folder: movie_on_ott;
    else (No)
        #LightBlue:Stay (Library / Unwatched);
    endif
  elseif (**Has Future Digital Date?**\n(OR Manual Date Override)) then (Yes)
    if (Current Status is **movie_coming_soon**\nOR Manual Date Override) then (Yes)
        #Orange:Folder: movie_on_ott;
    else (No)
        #LightBlue:Stay (Library / Unwatched);
    endif
  elseif (**Is Old / Released Globally?**\n(Released > 1 year ago or 6mo+ global)) then (Yes)
    if (Current Status is **movie_coming_soon**) then (Yes)
        #Orange:Folder: movie_on_ott;
    else (No)
        #LightBlue:Stay (Library / Unwatched);
    endif
  else (No)
    #LightGreen:Folder: movie_coming_soon;
  endif
}

partition "3. Display Date Logic" {
  if (Folder is **movie_on_ott**) then (Yes)
    :Show **OTT Release Date**;
  elseif (Folder is **movie_coming_soon**) then (Yes)
    :Show **Regional Theatrical Date**;
  else (Folder is **Library**)
    :Show **Original Global Release Date**;
  endif
}

stop
@enduml
```

## Key Rules
1.  **Add New Movie**: Priority is always given to the **Library** for available movies. Only "Future Digital" or "Coming Soon" movies go to the Upcoming feed.
2.  **Refresh Logic ("Gatekeeper Rule")**:
    *   Items only upgrade to **'On OTT'** if they were previously in **'Coming Soon'**.
    *   Items already in the **Library** (`movie_unwatched`) stay there, ensuring your watchlist remains stable.
3.  **Display Dates**:
    *   **On OTT**: Shows the Digital/Streaming release date.
    *   **Coming Soon**: Shows the Theatrical release date (Regional).
    *   **Library**: Shows the Original Global Release Date (Year).
