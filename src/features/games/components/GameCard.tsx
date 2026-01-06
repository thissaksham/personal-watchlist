import React from 'react';
import { Plus, Check } from 'lucide-react';
import type { Game } from '../../../types';

interface GameCardProps {
    game: Game;
    onClick?: () => void;
    onAdd?: (game: Game) => void;
    isAdded?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onClick, onAdd, isAdded }) => {
    return (
        <div className="discovery-card group" onClick={onClick}>
            <div className="discovery-poster-wrapper">
                <img
                    src={game.cover_url || ''}
                    alt={game.title}
                    className="discovery-poster-img"
                    loading="lazy"
                />

                {game.status === 'playing' && (
                    <div className="game-status-pill status-playing">
                        Playing
                    </div>
                )}

                {/* Add to Library Button */}
                <div className="discovery-actions">
                    {isAdded ? (
                        <button
                            className="added-badge"
                            title="Remove from Library"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Handle remove if needed
                            }}
                        >
                            <Check size={14} strokeWidth={3} />
                            <span>Added</span>
                        </button>
                    ) : (
                        <button
                            className="discovery-add-btn"
                            title="Add to Library"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onAdd) onAdd(game);
                            }}
                        >
                            <Plus size={20} />
                        </button>
                    )}
                </div>

                <div className="discovery-info-stack">
                    <h4 className="discovery-title line-clamp-2">{game.title}</h4>
                    {game.release_date && (
                        <p className="discovery-year" style={{ marginTop: '4px' }}>
                            {game.release_date}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
