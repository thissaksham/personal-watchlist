/**
 * MediaCard Component
 * Reusable card component for displaying media items
 */
import React from 'react';
import { Star } from 'lucide-react';
import styles from '../../styles/components/Card.module.css';
import { cn } from '../../utils/cn';
import { getPosterUrl } from '../../utils/imageUtils';
import { formatYear, formatRating } from '../../utils/formatting';
import type { TMDBMedia } from '../../lib/tmdb';

export interface MediaCardProps {
  media: TMDBMedia;
  onClick?: () => void;
  showRating?: boolean;
  showYear?: boolean;
  showDuration?: boolean;
  showSeasons?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  onClick,
  showRating = true,
  showYear = true,
  showDuration = false,
  showSeasons = false,
  className,
  children,
}) => {
  const title = media.title || media.name || 'Unknown';
  const posterUrl = getPosterUrl(media.poster_path, title);
  const year = formatYear(media.release_date || media.first_air_date);
  const rating = media.vote_average || 0;

  return (
    <div className={cn(styles.card, className)} onClick={onClick}>
      <div className={styles.posterWrapper}>
        <img src={posterUrl} alt={title} className={styles.posterImg} loading="lazy" />
        
        {/* Pills Stack */}
        <div className={styles.pillStack}>
          {showRating && rating > 0 && (
            <div className={cn(styles.mediaPill, styles.pillRating)}>
              <Star size={10} fill="#fbbf24" strokeWidth={0} />
              <span>{formatRating(rating)}</span>
            </div>
          )}
          
          {showYear && year && (
            <div className={cn(styles.mediaPill, styles.pillYear)}>
              <span>{year}</span>
            </div>
          )}
          
          {showDuration && media.runtime && (
            <div className={cn(styles.mediaPill, styles.pillDuration)}>
              <span>{media.runtime}m</span>
            </div>
          )}
          
          {showSeasons && media.number_of_seasons && (
            <div className={cn(styles.mediaPill, styles.pillSeasons)}>
              <span>{media.number_of_seasons} Season{media.number_of_seasons > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        
        {/* Actions Stack */}
        {children && (
          <div className={styles.actionsStack}>
            {children}
          </div>
        )}
      </div>
      
      <div className={styles.cardInfo}>
        <h3 className="text-sm font-semibold line-clamp-2">{title}</h3>
      </div>
    </div>
  );
};
