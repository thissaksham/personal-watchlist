/**
 * Media Helper Utilities
 * Common functions for working with media objects
 */

import type { TMDBMedia } from '../lib/tmdb';

/**
 * Extracts title from media object
 */
export const getMediaTitle = (media: TMDBMedia | null | undefined): string => {
  if (!media) return 'Unknown';
  return media.title || media.name || 'Unknown';
};

/**
 * Determines if media is a TV show
 */
export const isTVShow = (media: TMDBMedia | null | undefined): boolean => {
  if (!media) return false;
  return media.media_type === 'tv' || !!media.first_air_date || !!media.number_of_seasons;
};

/**
 * Determines if media is a movie
 */
export const isMovie = (media: TMDBMedia | null | undefined): boolean => {
  if (!media) return false;
  return media.media_type === 'movie' || (!!media.release_date && !media.first_air_date);
};

/**
 * Gets the release year from media
 */
export const getMediaYear = (media: TMDBMedia | null | undefined): string => {
  if (!media) return '';
  const dateStr = media.release_date || media.first_air_date;
  if (!dateStr) return '';
  return dateStr.substring(0, 4);
};

/**
 * Gets the release date (prefers release_date over first_air_date)
 */
export const getMediaReleaseDate = (media: TMDBMedia | null | undefined): string | null => {
  if (!media) return null;
  return media.release_date || media.first_air_date || null;
};
