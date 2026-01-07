import { Calendar, Star, Play, Clock } from 'lucide-react';
import { type TMDBMedia } from '../../../lib/tmdb';
import {
    getTMDBUrl,
    getMoctaleUrl,
    getJustWatchUrl,
    TMDB_ICON_BASE64,
    MOCTALE_ICON_BASE64,
    JUSTWATCH_ICON_BASE64
} from '../../../lib/urls';

interface CommonModalHeroProps {
    media: TMDBMedia;
    details: any;
    title: string;
    year: string | null | undefined;
    runtime?: number;
    trailerKey?: string;
    showTrailer: boolean;
    setShowTrailer: (show: boolean) => void;
    extraTags?: React.ReactNode;
    tmdbType: 'movie' | 'tv';
}

export const CommonModalHero = ({
    media,
    details,
    title,
    year,
    runtime,
    trailerKey,
    showTrailer,
    setShowTrailer,
    extraTags,
    tmdbType
}: CommonModalHeroProps) => {

    const backdropPath = media.backdrop_path || details?.backdrop_path;
    const posterPath = media.poster_path || details?.poster_path;
    const backdropUrl = backdropPath
        ? `https://image.tmdb.org/t/p/w1280${backdropPath}`
        : (posterPath ? `https://image.tmdb.org/t/p/w1280${posterPath}` : null);


    return (
        <div className="modal-hero">
            {backdropUrl ? (
                <div className="hero-backdrop">
                    <img
                        src={backdropUrl}
                        alt={title}
                        className={`hero-img ${!backdropPath ? 'blur-sm opacity-50' : ''}`}
                    />
                    <div className="hero-gradient" />
                </div>
            ) : (
                <div className="hero-backdrop">
                    <img
                        src={`https://placehold.co/780x440/1f2937/ffffff?text=${encodeURIComponent(title || 'No Image')}`}
                        alt={title}
                        className="hero-img opacity-50"
                    />
                    <div className="hero-gradient" />
                </div>
            )}

            {trailerKey && !showTrailer && (
                <div className="hero-play-overlay">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowTrailer(true);
                        }}
                        className="play-trailer-btn"
                    >
                        <div className="play-icon-wrapper">
                            <Play size={20} fill="currentColor" />
                        </div>
                        PLAY TRAILER
                    </button>
                </div>
            )}

            <div className="hero-content">
                <h2 className="hero-title">{title}</h2>
                <div className="meta-tags">
                    {year && <span className="tag"><Calendar size={14} /> {year}</span>}
                    {media.vote_average > 0 && (
                        <span className="tag rating">
                            <Star size={14} fill="currentColor" /> {media.vote_average?.toFixed(1)}
                        </span>
                    )}
                    {!!runtime && runtime > 0 && (
                        <span className="tag"><Clock size={14} /> {runtime} min</span>
                    )}

                    {extraTags}

                    <div className="floating-link-bar">
                        <a
                            href={getTMDBUrl(media.id, tmdbType)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="floating-link-btn tmdb-btn"
                            title="View on TMDB"
                        >
                            <img src={TMDB_ICON_BASE64} alt="TMDB" />
                        </a>
                        <a
                            href={getMoctaleUrl(media)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="floating-link-btn moctale-btn"
                            title="View on Moctale"
                        >
                            <img src={MOCTALE_ICON_BASE64} alt="Moctale" />
                        </a>
                        <a
                            href={getJustWatchUrl(media, tmdbType)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="floating-link-btn justwatch-btn"
                            title="View on JustWatch"
                        >
                            <img src={JUSTWATCH_ICON_BASE64} alt="JustWatch" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};
