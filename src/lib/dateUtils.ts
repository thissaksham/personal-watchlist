/**
 * Centralized Date Utility Library
 * Ensures consistent date parsing, comparison, and formatting across the application.
 * All logic assumes "Local Time" (client behavior) unless specified otherwise.
 */

// Helper to get "Today" at midnight (00:00:00.000) for comparisons
export const getTodayValues = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
};

/**
 * Safely parses a date string (YYYY-MM-DD) into a Date object.
 * Returns null if the string is invalid or empty.
 */
export const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
};

/**
 * Checks if a date is in the past or today (Released).
 */
export const isReleased = (dateStr: string | null | undefined): boolean => {
    const date = parseDate(dateStr);
    if (!date) return false;
    const today = getTodayValues();
    //If date is today or before, it is released.
    // However, usually we interpret release_date as "Available from 00:00"
    return date <= today;
};

/**
 * Checks if a date is strictly in the future.
 */
export const isFuture = (dateStr: string | null | undefined): boolean => {
    const date = parseDate(dateStr);
    if (!date) return false;
    const today = getTodayValues();
    return date > today;
};

/**
 * Calculates days remaining until a target date.
 * Returns negative number if passed.
 */
export const getDaysUntil = (dateStr: string | null | undefined): number | null => {
    const target = parseDate(dateStr);
    if (!target) return null;

    // Normalize target to midnight just in case, though parseDate usually does UTC->Local conversion 
    // depending on browser if string is ISO. 
    // TMDB dates are usually YYYY-MM-DD. `new Date('2025-01-01')` is treated as UTC in some browsers and Local in others?
    // Actually `new Date('2025-01-01')` (ISO format) is UTC in ES5+, but `new Date('2025/01/01')` is local.
    // To be safe and consistent, let's normalize to local midnight.

    // Standardize to Local Midnight handling
    const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const today = getTodayValues();

    const diffTime = t.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Formats a date string for display (e.g. "19 Jan 2024").
 */
export const formatDisplayDate = (dateStr: string | null | undefined): string => {
    const date = parseDate(dateStr);
    if (!date) return 'TBA';

    return date.toLocaleDateString('en-GB', { // en-GB gives DD Month YYYY usually
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

/**
 * Returns the effective year from a date string.
 */
export const getYear = (dateStr: string | null | undefined): number | null => {
    const date = parseDate(dateStr);
    return date ? date.getFullYear() : null;
};

/**
 * Returns today's date in YYYY-MM-DD format (Local Time).
 * Safe replacement for new Date().toISOString().split('T')[0]
 */
export const getTodayIsoString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
