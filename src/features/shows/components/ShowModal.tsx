import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, Hash, Hourglass } from 'lucide-react';
import { type TMDBMedia, type Video } from '../../../lib/tmdb';
import { useMediaDetails } from '../../media/hooks/useTMDB';
import { useWatchlist } from '../../watchlist/context/WatchlistContext';
import { usePreferences } from '../../../context/PreferencesContext';
import { calculateShowStats, getWatchProviders, getWatchLink } from '../../../utils/mediaUtils';
import { CommonModalHero } from '../../media/components/CommonModalHero';
import { CommonModalSidebar } from '../../media/components/CommonModalSidebar';
import { TrailerOverlay } from '../../media/components/TrailerOverlay';

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

    const showStats = calculateShowStats(media, details);
    const providers = getWatchProviders(media, details, region);
    const watchLink = getWatchLink(media, details, region);

    const trailer = details?.videos?.results?.find(
        (v: Video) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    const trailerKey = trailer?.key;

    const lastWatched = watchlistItem?.last_watched_season || 0;

    const extraTags = (
        <>
            {showStats?.bingeTime && <span className="tag theme-teal"><Hourglass size={14} /> {showStats.bingeTime}</span>}
            {(showStats && showStats.seasons > 0) && <span className="tag"><Layers size={14} /> {showStats.seasons} Seasons</span>}
            {(showStats && showStats.episodes > 0) && <span className="tag"><Hash size={14} /> {showStats.episodes} Episodes</span>}
        </>
    );

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            {showTrailer && trailerKey && (
                <TrailerOverlay trailerKey={trailerKey} onClose={() => setShowTrailer(false)} />
            )}

            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="close-btn"><X size={20} /></button>

                <CommonModalHero
                    media={media}
                    details={details}
                    title={title || 'Unknown Title'}
                    year={year}
                    trailerKey={trailerKey}
                    showTrailer={showTrailer}
                    setShowTrailer={setShowTrailer}
                    tmdbType="tv"
                    extraTags={extraTags}
                />

                <div className="modal-body">
                    <div className="modal-col-main">
                        {/* Real Data */}
                        {isLoading && !media.seasons && !details && (
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
                                    {(details?.seasons || media.seasons)?.filter(s => s.season_number > 0).map(season => {
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

                                        const nextEp = details?.next_episode_to_air || media.next_episode_to_air;
                                        const lastEp = details?.last_episode_to_air || media.last_episode_to_air;

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

                    <CommonModalSidebar
                        details={details}
                        media={media}
                        providers={providers}
                        watchLink={watchLink}
                        title={title || ''}
                    />
                </div>
            </div>
        </div>, document.body
    );
};
