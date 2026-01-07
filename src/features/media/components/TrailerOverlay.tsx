import { X } from 'lucide-react';

interface TrailerOverlayProps {
    trailerKey: string;
    onClose: () => void;
}

export const TrailerOverlay = ({ trailerKey, onClose }: TrailerOverlayProps) => {
    if (!trailerKey) return null;

    return (
        <div className="trailer-portal-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <button onClick={onClose} className="trailer-close-btn"><X size={32} /></button>
            <div className="trailer-container">
                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                    title="Trailer"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </div>
    );
};
