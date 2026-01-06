import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { PLATFORMS_DATA as PLATFORMS } from '../constants/platformData';

interface PlatformSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (platforms: string[]) => void;
    gameTitle: string;
    initialSelected?: string[];
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({ isOpen, onClose, onConfirm, gameTitle, initialSelected = [] }) => {
    const [selected, setSelected] = useState<string[]>(initialSelected);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Reset or update selection when modal opens or initialSelected changes
    React.useEffect(() => {
        if (isOpen) {
            setSelected(initialSelected || []);
        }
    }, [isOpen, initialSelected]);

    if (!isOpen) return null;

    const togglePlatform = (id: string) => {
        setSelected(prev =>
            prev.includes(id)
                ? prev.filter(p => p !== id)
                : [...prev, id]
        );
    };

    const handleConfirm = () => {
        onConfirm(selected);
        setSelected([]);
    };

    // Styles are defined inline for simplicity and to match the "no-tailwind" constraint effectively
    // while keeping the file self-contained.

    return (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
            <div className="modal-content" style={{ maxWidth: '500px', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white', marginBottom: '0.25rem' }}>Add to Library</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Which platform do you own <span style={{ color: 'white', fontWeight: 'bold' }}>{gameTitle}</span> on?
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        {PLATFORMS.map(platform => {
                            const isSelected = selected.includes(platform.id);
                            const isHovered = hoveredId === platform.id;

                            return (
                                <button
                                    key={platform.id}
                                    onClick={() => togglePlatform(platform.id)}
                                    onMouseEnter={() => setHoveredId(platform.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: isSelected
                                            ? '1px solid var(--primary)'
                                            : isHovered ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.05)',
                                        backgroundColor: isSelected
                                            ? 'rgba(20, 184, 166, 0.1)'
                                            : isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        color: isSelected ? 'white' : isHovered ? 'white' : 'var(--text-secondary)',
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        backgroundColor: isSelected ? 'var(--primary)' : 'rgba(0,0,0,0.3)',
                                        transition: 'background-color 0.2s'
                                    }}>
                                        <platform.icon size={20} color={isSelected ? 'white' : platform.color} />
                                    </div>

                                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{platform.label}</span>

                                    {isSelected && (
                                        <div style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--primary)' }}>
                                            <Check size={16} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1.5rem',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '1rem',
                    backgroundColor: 'rgba(0,0,0,0.2)'
                }}>
                    <button
                        onClick={() => onConfirm([])}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleConfirm}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: selected.length > 0 ? 'var(--primary)' : '#374151',
                            color: 'white',
                            fontWeight: '700',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            boxShadow: selected.length > 0 ? '0 4px 6px rgba(20, 184, 166, 0.2)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        {selected.length > 0 ? `Add Game` : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};
