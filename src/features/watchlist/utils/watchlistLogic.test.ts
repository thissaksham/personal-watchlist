
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { determineShowStatus } from './watchlistLogic';

describe('determineShowStatus', () => {
    // Lock time to Jan 1, 2024
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // Helper: 2023 is past, 2025 is future
    const PAST_DATE = '2023-01-01';
    const FUTURE_DATE = '2025-01-01';

    describe('Not Started (lastWatchedSeason: 0)', () => {
        it('should return show_new for Pilot/In Production status', () => {
            const result = determineShowStatus({ status: 'In Production' }, 0);
            expect(result).toBe('show_new');
        });

        it('should return show_finished for Ended status', () => {
            const result = determineShowStatus({
                status: 'Ended',
                seasons: [{ season_number: 1, air_date: PAST_DATE }]
            }, 0);
            expect(result).toBe('show_finished');
        });

        it('should return show_ongoing for Returning Series', () => {
            const result = determineShowStatus({
                status: 'Returning Series',
                seasons: [{ season_number: 1, air_date: PAST_DATE }]
            }, 0);
            expect(result).toBe('show_ongoing');
        });

        it('should return show_ongoing if status is unknown but has episodes', () => {
            // If "last_episode_to_air" exists, it usually implies it has started airing
            const result = determineShowStatus({
                status: 'Unknown',
                last_episode_to_air: { air_date: PAST_DATE, season_number: 1, episode_number: 1 }
            }, 0);
            // Implicit fallthrough for unknown status -> 'show_ongoing' logic in code?
            // Actually, code checks: totalReleased === 0 first.
            // If last_episode_to_air exists and is released, totalReleased might be > 0.
            // If seasons array is missing, totalReleased = 0.
            // If totalReleased == 0 and last_episode_to_air exists -> 'show_ongoing'.
            expect(result).toBe('show_ongoing');
        });

        it('should return show_new if no seasons released and no last episode', () => {
            const result = determineShowStatus({ seasons: [] }, 0);
            expect(result).toBe('show_new');
        });
    });

    describe('Started Watching', () => {
        const standardSeasons = [
            { season_number: 1, air_date: PAST_DATE },
            { season_number: 2, air_date: PAST_DATE }
        ];

        it('should return show_watching if user is behind (watched 1 of 2)', () => {
            const result = determineShowStatus({ seasons: standardSeasons }, 1);
            expect(result).toBe('show_watching');
        });

        it('should return show_watched if caught up (watched 2 of 2) and no future info', () => {
            const result = determineShowStatus({ seasons: standardSeasons }, 2);
            expect(result).toBe('show_watched');
        });

        it('should return show_watching if caught up but next episode is same season (Mid-Season Break)', () => {
            const result = determineShowStatus({
                seasons: standardSeasons,
                next_episode_to_air: { air_date: FUTURE_DATE, season_number: 2, episode_number: 10 }
            }, 2);
            // Watched S2 fully? Wait.
            // "Watched S2" usually means finished the RELEASED episodes of S2.
            // If next_episode_to_air is S2E10, and user marked S2 as watched... 
            // In my app logic, "Watched Season 2" usually implies "Synced up to S2".
            // If more episodes are coming for S2, user is technically "waiting for new episodes", 
            // but the status 'show_watching' implies "Active Watching / More to see".
            // The logic says: if next ep is same season -> show_watching.
            expect(result).toBe('show_watching');
        });

        it('should return show_returning if caught up and next episode is NEXT season', () => {
            const result = determineShowStatus({
                seasons: standardSeasons,
                next_episode_to_air: { air_date: FUTURE_DATE, season_number: 3, episode_number: 1 }
            }, 2);
            expect(result).toBe('show_returning');
        });

        it('should return show_returning if caught up and future season exists in seasons array', () => {
            const seasonsWithFuture = [
                ...standardSeasons,
                { season_number: 3, air_date: FUTURE_DATE }
            ];
            const result = determineShowStatus({ seasons: seasonsWithFuture }, 2);
            expect(result).toBe('show_returning');
        });
    });
});
