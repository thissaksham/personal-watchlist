# TV Show Status Logic

This document defines the Source of Truth for how TV Shows are categorized into statuses (`show_new`, `show_ongoing`, `show_watching`, `show_returning`, `show_finished`) based on aired episodes and user progress.

## PlantUML Diagram

```plantuml
@startuml
!theme plain
title TV Show Status Logic (Combined)

start
:Show Added or Refreshed;

partition "1. Check Content Availability" {
  if (**Has Aired Episodes?**) then (No)
    #LightGreen:Status: **show_new**\n(Folder: Upcoming);
    stop
  else (Yes)
  endif
}

partition "2. Check User Progress" {
  if (**Started Watching?**\n(last_watched_season > 0)) then (No)
    if (Is Show Ended?) then (Yes)
      #LightBlue:Status: **show_finished**\n(Library: To Watch);
    else (No)
      #LightBlue:Status: **show_ongoing**\n(Library: To Watch);
    endif
    stop
  else (Yes)
  endif
}

partition "3. Started Watching Logic" {
  note right
    User has watched at least 1 season.
    The goal is to distinguish 'Catching Up' from 'Caught Up'.
  end note

  if (**Released Seasons > Watched Seasons?**) then (Yes)
    note right
      User is BEHIND.
      (e.g., Watched S1, Released S3)
    end note
    #CornflowerBlue:Status: **show_watching**\n(Library: Watching);
  
  else (No - Fully Caught Up with Seasons)
    
    if (**Is there a Next Episode Date?**) then (Yes)
        
        if (**Next Ep Season == Watched Season?**) then (Yes)
           note right
             Ongoing Season / Weekly.
             (e.g., Waiting for next week's ep)
           end note
           #CornflowerBlue:Status: **show_watching**\n(Library: Watching);
        else (No - It is a Future Season)
           note right
             Between Seasons.
             (e.g., Waiting for Season Premiere)
           end note
           #Orange:Status: **show_returning**\n(Upcoming Feed);
        endif

    else (No Next Episode Known)
       
       if (**Is Future Season Announced?**) then (Yes)
         #Orange:Status: **show_returning**\n(Upcoming Feed also stays in watched);
       else (No)
         #Gray:Status: **show_watched**\n(Library: Watched);
       endif

    endif

  endif
}

stop
@enduml
```

## Key Status Definitions
1.  **`show_new`**: No episodes released yet. (Appears in **Upcoming**).
2.  **`show_ongoing` / `show_finished`**: Episodes exist, but you haven't started watching. (Appears in **Library: To Watch**).
3.  **`show_watching`**:
    *   **Catching Up**: You are behind (Released Seasons > Watched Seasons).
    *   **Weekly Watching**: You are caught up, but waiting for the next episode in the *current* season.
4.  **`show_returning`**: You are caught up, and waiting for the **next season** (Season Premiere). (Appears in **Upcoming** AND **Library: Watched**).
5.  **`show_watched`**: You are caught up, and no future content is known (or show is ended). (Appears in **Library: Watched**).
