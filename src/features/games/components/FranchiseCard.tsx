import React from 'react';
import type { Franchise } from '../../../types';
import { Layers } from 'lucide-react';

interface FranchiseCardProps {
    franchise: Franchise;
    onClick?: () => void;
}

export const FranchiseCard: React.FC<FranchiseCardProps> = ({ franchise, onClick }) => {
    // Get covers for the stack layers from the first few games
    const stackCovers = franchise.games.slice(0, 2).map(g => g.cover_url);

    // Determine filter style based on collective status
    const isAllDropped = franchise.games.every(g => g.status === 'dropped');
    const isAllFinished = franchise.games.every(g => ['finished', 'beaten'].includes(g.status || ''));

    const getFilterStyle = () => {
        if (isAllDropped) {
            return { filter: 'grayscale(100%) sepia(100%) hue-rotate(-50deg) saturate(600%) contrast(0.8)', opacity: 0.8 };
        }
        if (isAllFinished) {
            return { filter: 'grayscale(100%)', opacity: 0.8 };
        }
        return {};
    };

    const filterStyle = getFilterStyle();
    const isFiltered = Object.keys(filterStyle).length > 0;

    return (
        <div className="discovery-card group is-franchise" onClick={onClick}>
            {/* Background layers */}
            {stackCovers[1] && (
                <div className="stack-layer stack-layer-1">
                    <img src={stackCovers[1]} alt="" className="stack-layer-bg" />
                </div>
            )}

            {stackCovers[0] && (
                <div className="stack-layer stack-layer-2">
                    <img src={stackCovers[0]} alt="" className="stack-layer-bg" />
                </div>
            )}

            {/* Main top card */}
            <div className="discovery-poster-wrapper franchise-main-card">
                <img
                    src={franchise.cover_url || ''}
                    alt={franchise.name}
                    className={`discovery-poster-img ${isFiltered ? 'group-hover:!grayscale-0 group-hover:!filter-none group-hover:!opacity-100 transition-all duration-300' : ''}`}
                    style={filterStyle}
                    loading="lazy"
                />

                <div className="pill-stack">
                    <div className="media-pill" style={{ backgroundColor: 'rgba(20, 20, 20, 0.8)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <Layers size={10} />
                        <span>COLLECTION</span>
                    </div>
                </div>

                <div className="discovery-info-stack">
                    <div className="media-pill" style={{ backgroundColor: 'rgba(20, 20, 20, 0.8)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <span className="text-gray-300">{franchise.games.length} Games</span>
                    </div>
                    <h4 className="discovery-title line-clamp-2">{franchise.name}</h4>
                </div>
            </div>
        </div>
    );
};
