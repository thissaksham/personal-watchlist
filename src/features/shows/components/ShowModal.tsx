import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Star, PlayCircle, Play, Layers, Hash, Hourglass } from 'lucide-react';
import { type TMDBMedia } from '../../../lib/tmdb';
import { useMediaDetails } from '../../media/hooks/useTMDB';
import { useWatchlist } from '../../watchlist/context/WatchlistContext';
import { getMoctaleUrl, getTMDBUrl, getJustWatchUrl, TMDB_ICON_BASE64, MOCTALE_ICON_BASE64, JUSTWATCH_ICON_BASE64 } from '../../../lib/urls';
import { usePreferences } from '../../../context/PreferencesContext';
import { calculateShowStats, getWatchProviders, getWatchLink } from '../../../utils/mediaUtils';

interface ShowModalProps {
    media: TMDBMedia;
    onClose: () => void;
}

export const ShowModal = ({ media, onClose }: ShowModalProps) => {
    const { watchlist, markSeasonWatched, markSeasonUnwatched, updateProgress } = useWatchlist();
    const { region } = usePreferences();

    // React Query Hook
    const { data: details, isLoading } = useMediaDetails(media.id, 'tv');

    const [hoveredSeason, setHoveredSeason] = useState<number | null>(null);
    const [showTrailer, setShowTrailer] = useState(false);

    const watchlistItem = watchlist.find(i => i.tmdb_id === media.id && i.type === 'show');
    const isAdded = !!watchlistItem;

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
                                <a href={getJustWatchUrl(media, 'tv')} target="_blank" rel="noopener noreferrer" className="floating-link-btn justwatch-btn" title="View on JustWatch">
                                    <img src={JUSTWATCH_ICON_BASE64} alt="JustWatch" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-body">
                    <div className="modal-col-main">
                        {/* Seasons Grid (Interactive if Added) */}
                        {/* SKELETON LOADER - Only show if loading AND no data available yet */}
                        {isLoading && !(media as any).seasons && !(details as any)?.seasons && (
                            <div className="seasons-section mb-8 animate-pulse">
                                <div className="section-label mb-3">Seasons</div>
                                <div className="seasons-grid">
                                    {[1, 2, 3].map((_, i) => (
                                        <div key={i} className="season-item">
                                            <div className="season-bubble" style={{
                                                width: '50px',
                                                height: '50px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '50%'
                                            }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Real Data */}
                        {(details?.seasons || media.seasons) && (
                            <div className="seasons-section mb-8">
                                <div className="section-label">Seasons</div>
                                <div className="seasons-grid" onMouseLeave={() => setHoveredSeason(null)}>
                                    {(details?.seasons || media.seasons).filter((s: any) => s.season_number > 0).map((season: any) => {
                                        const seasonNum = Number(season.season_number);

                                        // Future Season Logic
                                        let isFuture = false;
                                        let airDateLabel = '';
                                        if (season.air_date) {
                                            const todayStr = new Date().toISOString().split('T')[0];
                                            if (season.air_date > todayStr) {
                                                isFuture = true;
                                                const airDate = new Date(season.air_date);
                                                airDateLabel = airDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            }
                                        } else if (season.episode_count === 0 || (details?.status !== 'Ended' && details?.status !== 'Canceled')) {
                                            // Assume future if no air date AND (no episodes OR show is still active)
                                            isFuture = true;
                                        }

                                        const nextEp = (details?.next_episode_to_air || (media as any).next_episode_to_air);
                                        const lastEp = (details?.last_episode_to_air || (media as any).last_episode_to_air);

                                        // A season is "Ongoing" if it's the next to air, OR if it's the last to air and show isn't finished
                                        // Prioritize next aired for the label to avoid multiple "ONGOING" tags
                                        const isOngoing = nextEp
                                            ? nextEp.season_number === seasonNum
                                            : lastEp?.season_number === seasonNum && details?.status !== 'Ended' && details?.status !== 'Canceled';

                                        const isWatched = isAdded && seasonNum <= lastWatched;
                                        const currentProgress = watchlistItem?.progress || 0;

                                        let isPreview = false;
                                        if (hoveredSeason !== null && isAdded && !isWatched && seasonNum <= hoveredSeason) {
                                            isPreview = true;
                                        }

                                        // Counter Logic: Only show on the FIRST uncompleted season
                                        const isCurrentSeason = seasonNum === (lastWatched + 1);

                                        return (
                                            <div key={season.id} className="season-item">
                                                <div className="season-wrapper">
                                                    <button
                                                        type="button"
                                                        disabled={isFuture || !isAdded || isOngoing}
                                                        onMouseEnter={() => !isFuture && isAdded && !isOngoing && setHoveredSeason(seasonNum)}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!isAdded) return;
                                                            if (seasonNum <= lastWatched) {
                                                                markSeasonUnwatched(media.id, seasonNum);
                                                            } else {
                                                                markSeasonWatched(media.id, seasonNum);
                                                            }
                                                        }}
                                                        className={`season-bubble ${isWatched ? 'watched' : ''} ${isPreview ? 'preview' : ''} ${isFuture ? 'future' : ''}`}
                                                        title={isFuture ? `Available on ${airDateLabel}` : `${season.name} (${season.episode_count} Episodes)`}
                                                    >
                                                        <span className="season-num">S{season.season_number}</span>
                                                    </button>

                                                    {isCurrentSeason && isAdded && !isFuture && (
                                                        <>
                                                            <div
                                                                className="counter-btn minus"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newProgress = Math.max(0, currentProgress - 1);
                                                                    updateProgress(media.id, 'show', newProgress);
                                                                }}
                                                            >
                                                                -
                                                            </div>
                                                            <div
                                                                className={`counter-btn plus ${currentProgress >= (season.episode_count || 0) ? 'disabled' : ''}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const maxEps = season.episode_count || 0;
                                                                    if (currentProgress >= maxEps) return;
                                                                    const newProgress = currentProgress + 1;
                                                                    updateProgress(media.id, 'show', newProgress);
                                                                }}
                                                            >
                                                                +
                                                            </div>
                                                            <div className="counter-badge">
                                                                {currentProgress}/{season.episode_count || '?'}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

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
