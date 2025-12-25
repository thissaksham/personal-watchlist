import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Star, PlayCircle, Play, Layers, Hash, Hourglass } from 'lucide-react';
import { tmdb, type TMDBMedia } from '../../lib/tmdb';
import { useWatchlist } from '../../context/WatchlistContext';
import { getMoctaleUrl, getTMDBUrl, TMDB_ICON_BASE64, MOCTALE_ICON_BASE64, JUSTWATCH_ICON_BASE64 } from '../../lib/urls';
import { usePreferences } from '../../context/PreferencesContext';
import { calculateShowStats, getWatchProviders, getWatchLink } from '../../utils/mediaUtils';

interface ShowModalProps {
    media: TMDBMedia;
    onClose: () => void;
}

export const ShowModal = ({ media, onClose }: ShowModalProps) => {
    const { watchlist, markSeasonWatched, markSeasonUnwatched } = useWatchlist();
    const { region } = usePreferences();
    const [details, setDetails] = useState<any>(null);
    const [hoveredSeason, setHoveredSeason] = useState<number | null>(null);
    const [showTrailer, setShowTrailer] = useState(false);

    const watchlistItem = watchlist.find(i => i.tmdb_id === media.id && i.type === 'show');
    const isAdded = !!watchlistItem;

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await tmdb.getDetails(media.id, 'tv', region);
                setDetails(data);
            } catch (err) {
                console.error("Failed to fetch show details", err);
            }
        };
        fetchDetails();
    }, [media.id]);

    const title = media.title || media.name;
    const year = (media.release_date || media.first_air_date)?.substring(0, 4);

    const backdropPath = media.backdrop_path || details?.backdrop_path;
    const posterPath = media.poster_path || details?.poster_path;
    const backdropUrl = backdropPath
        ? `https://image.tmdb.org/t/p/w1280${backdropPath}`
        : (posterPath ? `https://image.tmdb.org/t/p/w1280${posterPath}` : null);

    const showStats = calculateShowStats(media, details);
    const providers = getWatchProviders(media, details, region);
    const watchLink = getWatchLink(media, details, region);

    const trailer = details?.videos?.results?.find(
        (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    const trailerKey = trailer?.key;


    const lastWatched = watchlistItem?.last_watched_season || 0;

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            {showTrailer && trailerKey && (
                <div className="trailer-portal-overlay" onClick={(e) => { e.stopPropagation(); setShowTrailer(false); }}>
                    <button onClick={() => setShowTrailer(false)} className="trailer-close-btn"><X size={32} /></button>
                    <div className="trailer-container">
                        <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`} title="Trailer" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                </div>
            )}

            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="close-btn"><X size={20} /></button>

                <div className="modal-hero">
                    {backdropUrl ? (
                        <div className="hero-backdrop">
                            <img src={backdropUrl} alt={title} className={`hero-img ${!backdropPath ? 'blur-sm opacity-50' : ''}`} />
                            <div className="hero-gradient" />
                        </div>
                    ) : (
                        <div className="hero-backdrop">
                            <img src={`https://placehold.co/780x440/1f2937/ffffff?text=${encodeURIComponent(title || 'No Image')}`} alt={title} className="hero-img opacity-50" />
                            <div className="hero-gradient" />
                        </div>
                    )}

                    {trailerKey && !showTrailer && (
                        <div className="hero-play-overlay">
                            <button onClick={(e) => { e.stopPropagation(); setShowTrailer(true); }} className="play-trailer-btn">
                                <div className="play-icon-wrapper"><Play size={20} fill="currentColor" /></div>
                                PLAY TRAILER
                            </button>
                        </div>
                    )}

                    <div className="hero-content">
                        <h2 className="hero-title">{title}</h2>
                        <div className="meta-tags">
                            {year && <span className="tag"><Calendar size={14} /> {year}</span>}
                            {media.vote_average > 0 && <span className="tag rating"><Star size={14} fill="currentColor" /> {media.vote_average?.toFixed(1)}</span>}
                            {showStats?.bingeTime && <span className="tag theme-teal"><Hourglass size={14} /> {showStats.bingeTime}</span>}
                            {((showStats as any)?.seasons || 0) > 0 && <span className="tag"><Layers size={14} /> {(showStats as any).seasons} Seasons</span>}
                            {((showStats as any)?.episodes || 0) > 0 && <span className="tag"><Hash size={14} /> {(showStats as any).episodes} Episodes</span>}



                            <div className="floating-link-bar">
                                <a href={getTMDBUrl(media.id, 'tv')} target="_blank" rel="noopener noreferrer" className="floating-link-btn tmdb-btn" title="View on TMDB">
                                    <img src={TMDB_ICON_BASE64} alt="TMDB" />
                                </a>
                                <a href={getMoctaleUrl(media)} target="_blank" rel="noopener noreferrer" className="floating-link-btn moctale-btn" title="View on Moctale">
                                    <img src={MOCTALE_ICON_BASE64} alt="Moctale" />
                                </a>
                                <a href={`https://www.justwatch.com/in/search?content_type=show&q=${encodeURIComponent(title || '')}`} target="_blank" rel="noopener noreferrer" className="floating-link-btn justwatch-btn" title="View on JustWatch">
                                    <img src={JUSTWATCH_ICON_BASE64} alt="JustWatch" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-body">
                    <div className="modal-col-main">
                        {/* Seasons Grid (Interactive if Added) */}
                        {(details?.seasons || media.seasons) && (
                            <div className="seasons-section mb-8">
                                <div className="section-label">Seasons</div>
                                <div className="seasons-grid" onMouseLeave={() => setHoveredSeason(null)}>
                                    {(details?.seasons || media.seasons).filter((s: any) => s.season_number > 0).map((season: any) => {
                                        const seasonNum = Number(season.season_number);
                                        const isWatched = isAdded && seasonNum <= lastWatched;

                                        // Future Season Logic
                                        let isFuture = false;
                                        let airDateLabel = '';
                                        if (season.air_date) {
                                            const airDate = new Date(season.air_date);
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            if (airDate > today) {
                                                isFuture = true;
                                                airDateLabel = airDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            }
                                        }

                                        let isPreview = false;
                                        if (hoveredSeason !== null && isAdded && !isWatched && seasonNum <= hoveredSeason) {
                                            isPreview = true;
                                        }

                                        const nextEp = (details?.next_episode_to_air || (media as any).next_episode_to_air);
                                        const isOngoing = nextEp?.season_number === seasonNum;

                                        return (
                                            <div key={season.id} className="season-item">
                                                <button
                                                    type="button"
                                                    disabled={isFuture || !isAdded}
                                                    onMouseEnter={() => !isFuture && isAdded && setHoveredSeason(seasonNum)}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isAdded) return;
                                                        if (seasonNum <= lastWatched) {
                                                            markSeasonUnwatched(media.id, seasonNum);
                                                        } else {
                                                            markSeasonWatched(media.id, seasonNum);
                                                        }
                                                    }}
                                                    className={`season-bubble ${isWatched ? 'watched' : ''} ${isPreview ? 'preview' : ''} ${isFuture ? 'future' : ''} ${isOngoing && isWatched ? 'ongoing-watched' : ''}`}
                                                    title={isFuture ? `Available on ${airDateLabel}` : `${season.name} (${season.episode_count} Episodes)`}
                                                >
                                                    <span className="season-num">S{season.season_number}</span>
                                                </button>
                                                {isFuture && <span className="season-label-small future">Upcoming {airDateLabel}</span>}
                                                {isOngoing && !isFuture && <span className="season-label-small ongoing">Ongoing</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <section className="mb-8">
                            <h3 className="section-title">Overview</h3>
                            <p className="overview-text">{details?.overview || media.overview}</p>
                        </section>
                    </div>

                    <div className="modal-col-side">
                        {details?.genres && (
                            <div className="mb-6">
                                <h4 className="subtitle-text">Genres</h4>
                                <div className="genres-list">
                                    {details.genres.map((g: any) => (<span key={g.id} className="genre-tag">{g.name}</span>))}
                                </div>
                            </div>
                        )}

                        {providers.length > 0 && (
                            <div>
                                <h3 className="subtitle-text flex items-center gap-2">
                                    <PlayCircle size={14} /> Available to Stream
                                </h3>
                                <div className="provider-list">
                                    {providers.map((provider: any) => (
                                        <a key={provider.provider_id} href={watchLink} target="_blank" rel="noopener noreferrer" className="provider-logo hover:opacity-80 transition-opacity cursor-pointer block" title={`Watch on ${provider.provider_name}`}>
                                            <img src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} alt={provider.provider_name} className="w-full h-full object-cover" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {providers.length === 0 && (
                            <div>
                                <h3 className="subtitle-text flex items-center gap-2">
                                    <PlayCircle size={14} /> Download From
                                </h3>
                                <div className="provider-list">
                                    <a href={`https://ext.to/browse/?cat=1&name_filter=${encodeURIComponent(title || '')}`} target="_blank" rel="noopener noreferrer" className="provider-logo hover:opacity-80 transition-opacity cursor-pointer block" title={`Download ${title}`} style={{ background: 'transparent' }}>
                                        <img src="/ext-logo.png" alt="EXT" className="w-full h-full object-contain" />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>, document.body
    );
};
