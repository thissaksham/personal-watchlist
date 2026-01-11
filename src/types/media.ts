/**
 * Media Types
 * Type definitions for movies, shows, and media-related entities.
 */

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface Episode {
  runtime: number;
  season_number: number;
  episode_number: number;
  air_date: string;
  episode_type?: string;
}

export interface Season {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episode_count: number;
  air_date: string | null;
}

export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
}

export interface ExternalIds {
  imdb_id?: string;
  facebook_id?: string;
  instagram_id?: string;
  twitter_id?: string;
}

export interface WatchProviderData {
  link: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  ads?: WatchProvider[];
  free?: WatchProvider[];
}

/**
 * TMDBMedia - Core media type from TMDB API
 */
export interface TMDBMedia {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count?: number;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  media_type?: 'movie' | 'tv';
  runtime?: number;
  episode_run_time?: number[];
  number_of_episodes?: number;
  number_of_seasons?: number;
  last_episode_to_air?: Episode | null;
  next_episode_to_air?: Omit<Episode, 'runtime'> | null;
  external_ids?: ExternalIds;
  tvmaze_runtime?: number;
  status?: string;
  tmdb_status?: string;
  'watch/providers'?: {
    results: Record<string, WatchProviderData>;
  };
  genres?: Genre[];
  seasons?: Season[];
  videos?: {
    results: Video[];
  };
  credits?: unknown;
  production_companies?: ProductionCompany[];
  images?: unknown;
  reviews?: unknown;

  // App-specific properties
  type?: 'movie' | 'show' | 'tv' | 'Miniseries';
  countdown?: number;
  digital_release_date?: string;
  digital_release_note?: string | null;
  theatrical_release_date?: string;
  manual_date_override?: boolean;
  manual_release_date?: string | null;
  manual_ott_name?: string | null;
  moved_to_library?: boolean;
  dismissed_from_upcoming?: boolean;
  last_updated_at?: number;
  last_watched_season?: number;
  progress?: number;

  // UI transient properties
  tmdbMediaType?: 'movie' | 'tv' | 'show';
  tabCategory?: 'ott' | 'theatrical' | 'coming_soon' | 'other';
  seasonInfo?: string;
}
