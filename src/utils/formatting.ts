/**
 * Formatting Utilities
 * Centralized formatting functions for consistent display across the application
 */

/**
 * Formats a date string for display
 * Removes current year if present, shortens year format (2024 -> '24)
 */
export const formatDisplayDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const currentYear = new Date().getFullYear().toString();
  const year = date.getFullYear().toString();
  const month = date.toLocaleString('default', { month: 'short' });
  const day = date.getDate();
  
  let display = `${month} ${day}, ${year}`;
  
  // Remove current year if present
  if (display.endsWith(` ${currentYear}`)) {
    display = display.replace(` ${currentYear}`, '');
  }
  
  // Shorten year format (2024 -> '24)
  const yearMatch = display.match(/ (\d{4})$/);
  if (yearMatch) {
    const yearWrapper = yearMatch[0];
    const shortYear = yearMatch[1].slice(2);
    display = display.replace(yearWrapper, `'${shortYear}`);
  }
  
  return display;
};

/**
 * Formats a number as a rating with one decimal place
 */
export const formatRating = (rating: number | null | undefined): string => {
  if (!rating || rating === 0) return '0.0';
  return rating.toFixed(1);
};

/**
 * Formats duration in minutes to a human-readable string
 */
export const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes) return '';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
};

/**
 * Formats a countdown number of days
 */
export const formatCountdown = (days: number): string => {
  if (days < 0) return 'Released';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} years`;
};

/**
 * Truncates text to a maximum length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

/**
 * Formats a year from a date string
 */
export const formatYear = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  return dateStr.substring(0, 4);
};
