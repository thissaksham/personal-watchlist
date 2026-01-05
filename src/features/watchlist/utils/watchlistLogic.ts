import { isReleased, isFuture } from '../../../lib/dateUtils';
import type { WatchStatus } from '../../../types';

// Types (simplified for logic)
interface Season {
    season_number: number;
    air_date?: string;
}

interface ShowMetadata {
    status?: string;
    type?: string;
    seasons?: Season[];
    last_episode_to_air?: {
        air_date: string;
        season_number: number;
        episode_number: number;
        runtime?: number;
    };
    next_episode_to_air?: {
        air_date: string;
        season_number: number;
        episode_number: number;
    };
}



/**
 * Determines the status of a TV Show based on its metadata and user progress.
 */
export function determineShowStatus(
    metadata: ShowMetadata,
    lastWatchedSeason: number
): WatchStatus {

    // 1. Data Validation: Ensure seasons exist
    const seasons = metadata.seasons || [];

    // 2. Filter released seasons using robust date check
    const releasedSeasons = seasons.filter((s) =>
        s.season_number > 0 && s.air_date && isReleased(s.air_date)
    );
    const totalReleased = releasedSeasons.length;

    // 3. Status State Machine
    if (totalReleased === 0) {
        // No released seasons? Check if episodes exist at all.
        if (!metadata.last_episode_to_air) {
            return 'show_new';
        } else {
            return 'show_ongoing';
        }
    }

    if (lastWatchedSeason === 0) {
        // Not Started

        // 1. New Show Check (Highest Priority - S1 is going to air)
        // If no seasons have released yet, or specifically if last_episode_to_air is missing
        if (totalReleased === 0 || !metadata.last_episode_to_air) {
            return 'show_new';
        }

        // 2. Finished Status Check
        const status = metadata.status;
        const type = metadata.type;
        const isFinished = status === 'Ended' || status === 'Canceled' || status === 'Miniseries' || type === 'Miniseries';
        
        if (isFinished) {
            return 'show_finished';
        }

        // 3. Ongoing (Default for released content that isn't finished)
        return 'show_ongoing';
    }

    // Started Watching
    if (lastWatchedSeason < totalReleased) {
        // User is behind the latest release
        return 'show_watching';
    }

    // Caught Up (User has watched everything currently released)
    let isFutureConfirmed = false;

    // Check "Next Episode" anchor
    if (metadata.next_episode_to_air?.air_date) {
        if (isFuture(metadata.next_episode_to_air.air_date)) {
            isFutureConfirmed = true;
            if (metadata.next_episode_to_air.season_number === lastWatchedSeason) {
                return 'show_watching'; // Mid-season break
            } else {
                return 'show_returning'; // Between seasons
            }
        }
    }

    // Fallback: Check for future seasons in explicit array
    if (!isFutureConfirmed) {
        const hasFutureSeason = seasons.some((s) =>
            s.season_number > lastWatchedSeason &&
            s.air_date && isFuture(s.air_date)
        );

        if (hasFutureSeason) {
            return 'show_returning';
        }
    }

    // Truly caught up with no future content known
    const status = metadata.status;
    const isFinished = status === 'Ended' || status === 'Canceled' || status === 'Miniseries' || metadata.type === 'Miniseries';
    
    // If show is finished, then being caught up means "Watched".
    if (isFinished) {
        return 'show_watched';
    }

    // If show is still active (Returning Series, In Production), being caught up implies "Watched" (waiting for next season, no active episodes).
    return 'show_watched';
}
