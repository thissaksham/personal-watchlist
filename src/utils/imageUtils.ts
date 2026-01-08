/**
 * Image Utilities
 * Centralized image URL generation and placeholder handling
 */

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const PLACEHOLDER_BASE = 'https://placehold.co/500x750/1f2937/ffffff';

/**
 * Generates a TMDB poster URL
 */
export const getPosterUrl = (posterPath: string | null | undefined, title?: string): string => {
  if (!posterPath) {
    const placeholderText = title ? encodeURIComponent(title) : 'No+Image';
    return `${PLACEHOLDER_BASE}?text=${placeholderText}`;
  }
  
  if (posterPath.startsWith('http')) {
    return posterPath;
  }
  
  return `${TMDB_IMAGE_BASE}${posterPath}`;
};

/**
 * Generates a TMDB backdrop URL
 */
export const getBackdropUrl = (backdropPath: string | null | undefined): string => {
  if (!backdropPath) return '';
  
  if (backdropPath.startsWith('http')) {
    return backdropPath;
  }
  
  return `https://image.tmdb.org/t/p/w1280${backdropPath}`;
};

/**
 * Generates a provider logo URL
 */
export const getProviderLogoUrl = (logoPath: string | null | undefined): string => {
  if (!logoPath) return '';
  
  if (logoPath.startsWith('http')) {
    return logoPath;
  }
  
  return `https://image.tmdb.org/t/p/w45${logoPath}`;
};

/**
 * Generates a flag image URL from country code
 */
export const getFlagUrl = (countryCode: string): string => {
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
};
