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

    return (
        <div className="game-card-root is-franchise" onClick={onClick}>
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
            <div className="game-poster-wrapper franchise-main-card">
                <img
                    src={franchise.cover_url || ''}
                    alt={franchise.name}
                    className="game-poster-img"
                />

                <div className="game-pill">
                    <Layers size={10} />
                    <span>COLLECTION</span>
                </div>

                <div className="game-info-overlay">
                    <h4 className="game-title">{franchise.name}</h4>
                    <p className="game-subtitle">{franchise.games.length} Games</p>
                </div>
            </div>
        </div>
    );
};
