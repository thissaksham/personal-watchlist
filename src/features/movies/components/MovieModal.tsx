import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { type TMDBMedia, type Video } from '../../../lib/tmdb';
import { useMediaDetails } from '../../media/hooks/useTMDB';
import { getWatchProviders, getWatchLink } from '../../../utils/mediaUtils';
import { usePreferences } from '../../../context/PreferencesContext';
import { CommonModalHero } from '../../media/components/CommonModalHero';
import { CommonModalSidebar } from '../../media/components/CommonModalSidebar';
import { TrailerOverlay } from '../../media/components/TrailerOverlay';

interface MovieModalProps {
    media: TMDBMedia;
    onClose: () => void;
}

export const MovieModal = ({ media, onClose }: MovieModalProps) => {
    const { region } = usePreferences();

    // React Query Hook
    const { data: details } = useMediaDetails(media.id, 'movie');

    const [showTrailer, setShowTrailer] = useState(false);

    const title = media.title || media.name;
    const year = (media.release_date || media.first_air_date)?.substring(0, 4);

    const providers = getWatchProviders(media, details, region);
    const watchLink = getWatchLink(media, details, region);
    const runtime = details?.runtime || media.runtime;

    const trailer = details?.videos?.results?.find(
        (v: Video) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    const trailerKey = trailer?.key;


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
                    runtime={runtime}
                    trailerKey={trailerKey}
                    showTrailer={showTrailer}
                    setShowTrailer={setShowTrailer}
                    tmdbType="movie"
                />

                <div className="modal-body">
                    <div className="modal-col-main">
                        <h3 className="section-title">Overview</h3>
                        <p className="overview-text">{details?.overview || media.overview}</p>
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

