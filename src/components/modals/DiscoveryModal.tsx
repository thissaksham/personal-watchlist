import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, Star, PlayCircle, Play, Layers, Hash, Hourglass } from 'lucide-react';
import { tmdb, type TMDBMedia, TMDB_REGION } from '../../lib/tmdb';
import { getMoctaleUrl, getTMDBUrl, TMDB_ICON_BASE64, MOCTALE_ICON_BASE64 } from '../../lib/urls';
import { Download } from 'lucide-react';
import { calculateShowStats } from '../../utils/mediaUtils';

interface DiscoveryModalProps {
    media: TMDBMedia;
    type: 'movie' | 'tv';
    onClose: () => void;
}

export const DiscoveryModal = ({ media, type, onClose }: DiscoveryModalProps) => {
    const [details, setDetails] = useState<any>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await tmdb.getDetails(media.id, type);
                setDetails(data);
            } catch (err) {
                console.error("Failed to fetch details", err);
            }
        };
        fetchDetails();
    }, [media.id, type]);

    const title = media.title || media.name;
    const year = (media.release_date || media.first_air_date)?.substring(0, 4);

    const backdropPath = media.backdrop_path || details?.backdrop_path;
    const posterPath = media.poster_path || details?.poster_path;
    const backdropUrl = backdropPath
        ? `https://image.tmdb.org/t/p/w780${backdropPath}`
        : (posterPath ? `https://image.tmdb.org/t/p/w780${posterPath}` : null);

    const detailsProviders = details?.['watch/providers']?.results?.[TMDB_REGION]?.flatrate;
    const mediaProviders = media['watch/providers']?.results?.[TMDB_REGION]?.flatrate;
    const providers = (detailsProviders && detailsProviders.length > 0) ? detailsProviders : (mediaProviders || []);
    const watchLink = details?.['watch/providers']?.results?.[TMDB_REGION]?.link || media['watch/providers']?.results?.[TMDB_REGION]?.link;

    const showStats = calculateShowStats(media, details);
    const runtimeDisplay = type === 'movie' ? (details?.runtime || media.runtime) : showStats?.avgRuntime;

    const trailer = details?.videos?.results?.find(
        (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    const trailerKey = trailer?.key;
    const [showTrailer, setShowTrailer] = useState(false);



    return (
        <div className="modal-overlay" onClick={onClose}>
            {showTrailer && trailerKey && createPortal(
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={(e) => { e.stopPropagation(); setShowTrailer(false); }}>
                    <button onClick={() => setShowTrailer(false)} style={{ position: 'absolute', top: '20px', right: '20px', color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}><X size={32} /></button>
                    <div style={{ width: '90%', maxWidth: '1200px', height: '80vh', backgroundColor: 'black', borderRadius: '16px', overflow: 'hidden' }}>
                        <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`} title="Trailer" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                </div>, document.body
            )}

            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="close-btn" style={{ zIndex: 50 }}><X size={20} /></button>

                <div className="modal-hero relative" style={{ position: 'relative' }}>
                    {backdropUrl ? (
                        <div className="absolute inset-0" style={{ position: 'absolute', inset: 0 }}>
                            <img src={backdropUrl} alt={title} className={`w-full h-full object-cover ${!backdropPath ? 'blur-sm opacity-50' : ''}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1014] via-[#0f1014]/40 to-transparent" />
                        </div>
                    ) : (
                        <div className="absolute inset-0" style={{ position: 'absolute', inset: 0 }}>
                            <img src={`https://placehold.co/780x440/1f2937/ffffff?text=${encodeURIComponent(title || 'No Image')}`} alt={title} className="w-full h-full object-cover opacity-50" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1014] via-transparent to-transparent" />
                        </div>
                    )}

                    {trailerKey && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, pointerEvents: 'none' }}>
                            <button onClick={(e) => { e.stopPropagation(); setShowTrailer(true); }} style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 24px 10px 10px', backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '50px', color: '#ffffff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', letterSpacing: '0.5px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)'; e.currentTarget.style.transform = 'scale(1.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.4)'; e.currentTarget.style.transform = 'scale(1)'; }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}><Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} /></div>
                                PLAY TRAILER
                            </button>
                        </div>
                    )}

                    <div className="hero-content">
                        <h2 className="hero-title">{title}</h2>
                        <div className="meta-tags">
                            {year && <span className="tag"><Calendar size={14} /> {year}</span>}
                            <span className="tag rating"><Star size={14} fill="currentColor" /> {media.vote_average?.toFixed(1)}</span>
                            {runtimeDisplay > 0 && <span className="tag"><Clock size={14} /> {runtimeDisplay} min</span>}
                            {showStats?.bingeTime && <span className="tag" style={{ borderColor: '#2dd4bf', color: '#2dd4bf' }}><Hourglass size={14} /> {showStats.bingeTime}</span>}
                            {showStats?.seasons ? <span className="tag"><Layers size={14} /> {showStats.seasons} Seasons</span> : null}
                            {showStats?.episodes ? <span className="tag"><Hash size={14} /> {showStats.episodes} Episodes</span> : null}
                        </div>
                    </div>

                    {/* Floating External Links */}
                    <div className="floating-link-bar">
                        <a
                            href={getTMDBUrl(media.id, type)}
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
                    </div>
                </div>

                <div className="modal-body relative">
                    <div className="u-vstack">

                        {/* Seasons List (Read-Only / Info) */}
                        {type === 'tv' && (details?.seasons || media.seasons) && (
                            <div style={{ marginBottom: '24px', width: '100%' }}>
                                <div style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', color: '#6b7280', marginBottom: '12px' }}>Seasons</div>
                                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', overflowX: 'auto', padding: '16px', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                                    {(details?.seasons || media.seasons).filter((s: any) => s.season_number > 0).map((season: any) => {
                                        // Simple display for discovery
                                        const isFuture = season.air_date && new Date(season.air_date) > new Date();
                                        return (
                                            <div key={season.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <div
                                                    style={{
                                                        width: '44px', height: '44px', minWidth: '44px', minHeight: '44px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        color: '#9ca3af',
                                                        fontWeight: 'bold',
                                                        opacity: isFuture ? 0.5 : 1
                                                    }}
                                                    title={`${season.name} (${season.episode_count} Episodes)`}
                                                >
                                                    <span style={{ fontSize: '13px', letterSpacing: '-0.5px' }}>S{season.season_number}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                            </div>
                        )}

                        <div>
                            <h3 className="section-title">Overview</h3>
                            <p className="overview-text">{details?.overview || media.overview}</p>
                        </div>
                    </div>

                    <div className="u-vstack">


                        {/* Action Button Removed per User Request */}


                        {details?.genres && (
                            <div>
                                <h4 className="subtitle-text">Genres</h4>
                                <div className="genres-list">{details.genres.map((g: any) => (<span key={g.id} className="genre-tag">{g.name}</span>))}</div>
                            </div>
                        )}

                        {providers.length > 0 && (
                            <div>
                                <h3 className="section-title text-sm uppercase tracking-wider text-gray-500 mb-3 mt-4">
                                    <div className="flex items-center gap-2"><PlayCircle size={16} />Available to Stream</div>
                                </h3>
                                <div className="provider-list">
                                    {providers.map((provider: any) => (
                                        <a key={provider.provider_id} href={watchLink} target="_blank" rel="noopener noreferrer" className="provider-logo hover:opacity-80 transition-opacity cursor-pointer block" title={`Watch on ${provider.provider_name}`}>
                                            <img src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} alt={provider.provider_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {providers.length === 0 && (
                            <div>
                                <h3 className="section-title text-sm uppercase tracking-wider text-gray-500 mb-3 mt-4">
                                    <div className="flex items-center gap-2"><Download size={16} />Download From</div>
                                </h3>
                                <div className="provider-list">
                                    <a href={type === 'movie' ? `https://ext.to/browse/?cat=1&name_filter=${encodeURIComponent(title || '')}` : `https://ext.to/tv-series/?title=${encodeURIComponent(title || '')}`} target="_blank" rel="noopener noreferrer" className="provider-logo hover:opacity-80 transition-opacity cursor-pointer block" title={`Download ${title}`} style={{ background: 'transparent' }}>
                                        <img src="/ext-logo.png" alt="EXT" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
