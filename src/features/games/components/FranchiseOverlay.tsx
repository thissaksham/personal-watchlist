import React, { useEffect } from 'react';
import type { Franchise } from '../../../types';
import { X } from 'lucide-react';
import { GameCard } from './GameCard';

interface FranchiseOverlayProps {
    franchise: Franchise | null;
    onClose: () => void;
}

export const FranchiseOverlay: React.FC<FranchiseOverlayProps> = ({ franchise, onClose }) => {
    const isActive = !!franchise;

    // Handle Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isActive) {
            document.addEventListener('keydown', handleEsc);
            // Prevent scrolling on body when modal is open
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isActive, onClose]);

    if (!franchise && !isActive) return null;

    return (
        <div className={`franchise-overlay ${isActive ? 'active' : ''}`}>
            <div className="franchise-overlay-backdrop" onClick={onClose} />

            <div className="franchise-modal">
                <div className="franchise-modal-header">
                    <div>
                        <h2 className="franchise-title">{franchise?.name} Collection</h2>
                        <p className="game-subtitle">Viewing {franchise?.games.length} titles in library</p>
                    </div>
                    <button className="close-modal-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="franchise-modal-body">
                    <div className="franchise-games-grid">
                        {franchise?.games.map((game) => (
                            <GameCard
                                key={game.id}
                                game={game}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
