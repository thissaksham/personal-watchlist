import React from 'react';
import { Plus, Check, Star } from 'lucide-react';
import { type TMDBMedia } from '../../lib/tmdb';

interface DiscoveryCardProps {
    media: TMDBMedia;
    isAdded: boolean;
    onAdd: (media: TMDBMedia) => void;
    onClick: (media: TMDBMedia) => void;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
    media,
    isAdded,
    onAdd,
    onClick
}) => {
    const title = media.title || media.name || 'Unknown';
    const posterUrl = media.poster_path
        ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
        : `https://placehold.co/500x750/1f2937/ffffff?text=${encodeURIComponent(title)}`;

    const year = (media.release_date || media.first_air_date)?.substring(0, 4);

    return (
        <div className="discovery-card group" onClick={() => onClick(media)}>
            <div className="discovery-poster-wrapper">
                <img src={posterUrl} alt={title} className="discovery-poster-img" loading="lazy" />

                {/* Content Overlay */}
                <div className="discovery-overlay">
                    <div className="discovery-actions">
                        {isAdded ? (
                            <div className="added-badge">
                                <Check size={14} strokeWidth={3} />
                                <span>Added</span>
                            </div>
                        ) : (
                            <button
                                className="discovery-add-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAdd(media);
                                }}
                            >
                                <Plus size={20} />
                            </button>
                        )}
                    </div>

                    <div className="discovery-info">
                        <div className="flex items-center gap-2 mb-1">
                            {media.vote_average > 0 && (
                                <div className="discovery-rating">
                                    <Star size={10} fill="#fbbf24" strokeWidth={0} />
                                    <span>{media.vote_average.toFixed(1)}</span>
                                </div>
                            )}
                            {year && <span className="discovery-year">{year}</span>}
                        </div>
                        <h4 className="discovery-title line-clamp-1">{title}</h4>
                    </div>
                </div>
            </div>
        </div>
    );
};
