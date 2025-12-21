import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Clock, Star, PlayCircle, Play, Layers, Hash, Hourglass } from 'lucide-react';
import { tmdb, type TMDBMedia } from '../../lib/tmdb';
// import { useWatchlist } from '../../context/WatchlistContext';

interface DiscoveryModalProps {
    media: TMDBMedia;
    type: 'movie' | 'tv';
    onClose: () => void;
}

export const DiscoveryModal = ({ media, type, onClose }: DiscoveryModalProps) => {
    // const { addToWatchlist, isInWatchlist } = useWatchlist(); // logic removed

    const [details, setDetails] = useState<any>(null);
    // const inList = isInWatchlist(media.id, type === 'tv' ? 'show' : 'movie');

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

    const detailsProviders = details?.['watch/providers']?.results?.['IN']?.flatrate;
    const mediaProviders = media['watch/providers']?.results?.['IN']?.flatrate;
    const providers = (detailsProviders && detailsProviders.length > 0) ? detailsProviders : (mediaProviders || []);
    const watchLink = details?.['watch/providers']?.results?.['IN']?.link || media['watch/providers']?.results?.['IN']?.link;

    const getShowStats = () => {
        if (type !== 'tv') return null;
        let avgRuntime = 0;
        if (media.tvmaze_runtime) avgRuntime = media.tvmaze_runtime;
        else if (details?.episode_run_time && details.episode_run_time.length > 0) avgRuntime = Math.min(...details.episode_run_time);
        else if (media.episode_run_time && media.episode_run_time.length > 0) avgRuntime = Math.min(...media.episode_run_time);
        else if (details?.runtime) avgRuntime = details.runtime;

        const episodes = details?.number_of_episodes || media.number_of_episodes || 0;
        const seasons = details?.number_of_seasons || media.number_of_seasons || 0;

        let bingeTime = '';
        if (avgRuntime && episodes) {
            const totalMinutes = avgRuntime * episodes;
            const days = Math.floor(totalMinutes / (24 * 60));
            const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
            const minutes = totalMinutes % 60;
            if (days > 0) bingeTime = `${days}d ${hours}h`;
            else bingeTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
        return { avgRuntime, episodes, seasons, bingeTime };
    };

    const showStats = getShowStats();
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
                            {runtimeDisplay && <span className="tag"><Clock size={14} /> {runtimeDisplay} min</span>}
                            {showStats?.bingeTime && <span className="tag" style={{ borderColor: '#2dd4bf', color: '#2dd4bf' }}><Hourglass size={14} /> {showStats.bingeTime}</span>}
                            {showStats?.seasons ? <span className="tag"><Layers size={14} /> {showStats.seasons} Seasons</span> : null}
                            {showStats?.episodes ? <span className="tag"><Hash size={14} /> {showStats.episodes} Episodes</span> : null}
                        </div>
                    </div>
                </div>

                <div className="modal-body relative">
                    <div className="u-vstack">

                        {/* No Season Progress in Discovery - keeps it clean */}

                        <div>
                            <h3 className="section-title">Overview</h3>
                            <p className="overview-text">{details?.overview || media.overview}</p>
                        </div>
                    </div>

                    <div className="u-vstack">


                        {details?.genres && (
                            <div>
                                <h4 className="subtitle-text">Genres</h4>
                                <div className="genres-list">{details.genres.map((g: any) => (<span key={g.id} className="genre-tag">{g.name}</span>))}</div>
                            </div>
                        )}

                        {providers.length > 0 && (
                            <div>
                                <h3 className="section-title text-sm uppercase tracking-wider text-gray-500 mb-3 mt-4">
                                    <div className="flex items-center gap-2"><PlayCircle size={16} />Available to Stream (IN)</div>
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
                    </div>
                </div>
            </div>
        </div>
    );
};
