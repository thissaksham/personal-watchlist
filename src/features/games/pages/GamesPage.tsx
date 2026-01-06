import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Gamepad2, Search, ListFilter } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GameCard } from '../components/GameCard';
import { FranchiseCard } from '../components/FranchiseCard';
import { FranchiseOverlay } from '../components/FranchiseOverlay';
import type { Franchise, Game } from '../../../types';
import '../styles/GameCards.css';
import styles from '../../../components/ui/SmartPillButton.module.css';

export const GamesPage = () => {
    const [selectedFranchise, setSelectedFranchise] = useState<Franchise | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // -------------------------------------------------------------------------
    // 1. FILTER STATE & URL SYNC
    // -------------------------------------------------------------------------

    // Determine initial view from URL
    const getInitialViewMode = () => {
        const pathParts = location.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1].toLowerCase();

        if (lastPart === 'played') return 'Played';
        if (lastPart === 'dropped') return 'Dropped';
        return 'Unplayed';
    };

    const [viewMode, setViewMode] = useState<string>(getInitialViewMode());

    useEffect(() => {
        const mode = getInitialViewMode();
        if (mode !== viewMode) setViewMode(mode);
    }, [location.pathname]);

    const handleViewModeChange = (mode: string) => {
        navigate(`/games/${mode.toLowerCase()}`);
    };

    // -------------------------------------------------------------------------
    // 2. PILL BUTTON LOGIC (Custom for Games)
    // -------------------------------------------------------------------------
    const slots = ['Unplayed', 'Played', 'Dropped'];
    const activeIndex = slots.indexOf(viewMode);
    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
    const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

    const updateHighlight = () => {
        if (activeIndex !== -1 && optionRefs.current[activeIndex]) {
            const element = optionRefs.current[activeIndex]!;
            setHighlightStyle({ width: `${element.offsetWidth}px`, left: `${element.offsetLeft}px` });
        }
    };

    useLayoutEffect(() => {
        updateHighlight();
        window.addEventListener('resize', updateHighlight);
        return () => window.removeEventListener('resize', updateHighlight);
    }, [activeIndex]);

    // -------------------------------------------------------------------------
    // 3. SEARCH & CONTENT (Local Filter)
    // -------------------------------------------------------------------------
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState<'date_added' | 'rating' | 'release_date' | 'random'>('date_added');
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    // Close sort menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setIsSortOpen(false);
            }
        };

        if (isSortOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSortOpen]);

    const libraryGames: Game[] = [];
    const libraryFranchises: Franchise[] = [];

    // Filter Logic
    const filteredGames = libraryGames.filter(game => {
        // View Mode & Search Filter
        if (searchTerm && !game.title.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        return true;
    });

    return (
        <div className="main-content">
            <header className="page-header flex justify-between items-end mb-6">
                <div>
                    <h1 className="page-title text-3xl font-bold flex items-baseline">
                        Games Library
                        <span style={{ fontSize: '0.9rem', opacity: 0.2, fontWeight: 'normal', marginLeft: '10px' }} className="select-none">
                            showing {filteredGames.length} results
                        </span>
                    </h1>
                    <p className="subtitle text-gray-400 mt-1">Manage your gaming collection and track progress.</p>
                </div>

                <div
                    className="flex items-center"
                    style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '24px' }}
                >
                    {/* Games Pill Button */}
                    <div className={styles['pill-button']}>
                        {slots.map((slot, index) => (
                            <div
                                key={slot}
                                ref={el => { optionRefs.current[index] = el; }}
                                className={`${styles['pill-button-selection']} ${viewMode === slot ? styles['pill-button-selection_active'] : ''}`}
                                onClick={() => handleViewModeChange(slot)}
                            >
                                {slot}
                            </div>
                        ))}
                        <div className={styles['pill-button-highlight']} style={highlightStyle}></div>
                    </div>

                    {/* Sort Dropdown - Reused from LibraryPage */}
                    <div className="relative z-50" ref={sortRef} style={{ position: 'relative', marginRight: '8px' }}>
                        <button
                            className={`pill filter-trigger gap-2 transition-colors ${isSortOpen ? 'bg-white/10 text-white active' : 'hover:bg-white/10'}`}
                            onClick={() => setIsSortOpen(!isSortOpen)}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            <span className="text-sm font-medium">Sort</span>
                            <ListFilter size={16} />
                        </button>

                        {isSortOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '8px',
                                    zIndex: 1000,
                                    minWidth: '220px'
                                }}
                                className="animate-in fade-in slide-in-from-top-2 duration-200"
                            >
                                <div
                                    style={{
                                        backgroundColor: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '4px',
                                        width: '100%',
                                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px'
                                    }}
                                >
                                    {[
                                        { id: 'date_added', label: 'Date Added' },
                                        { id: 'rating', label: 'Highest Rated' },
                                        { id: 'release_date', label: 'Newest Release' },
                                        { id: 'random', label: 'Random Shuffle' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => {
                                                setSortOption(opt.id as any);
                                                setIsSortOpen(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '10px 12px',
                                                fontSize: '14px',
                                                borderRadius: '8px',
                                                backgroundColor: sortOption === opt.id ? 'var(--primary)' : 'transparent',
                                                color: sortOption === opt.id ? 'white' : 'var(--text-secondary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s',
                                                fontWeight: sortOption === opt.id ? '600' : '400'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (sortOption !== opt.id) {
                                                    e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                                                    e.currentTarget.style.color = 'var(--text-primary)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (sortOption !== opt.id) {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                                }
                                            }}
                                        >
                                            {opt.label}
                                            {sortOption === opt.id && (
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 0 8px rgba(255,255,255,0.5)' }} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Local Search Input */}
                    <div className="search-bar" style={{ position: 'relative', width: '250px' }}>
                        <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search Games..."
                            className="search-input"
                            style={{ width: '100%' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div className="games-grid">
                {/* Franchises */}
                {libraryFranchises.map((franchise) => (
                    <FranchiseCard
                        key={franchise.id}
                        franchise={franchise}
                        onClick={() => setSelectedFranchise(franchise)}
                    />
                ))}

                {/* Single Games */}
                {libraryGames.map((game) => (
                    <GameCard
                        key={game.id}
                        game={game}
                    />
                ))}
            </div>

            {libraryGames.length === 0 && libraryFranchises.length === 0 && (
                <div className="u-full-center py-20 u-vstack text-center" style={{ color: '#94a3b8' }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '2rem',
                        borderRadius: '50%',
                        marginBottom: '1.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <Gamepad2 size={48} color="#14b8a6" />
                    </div>
                    <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        {viewMode === 'Unplayed' ? "Your backlog is empty" : `No ${viewMode.toLowerCase()} games`}
                    </h2>
                    <p style={{ maxWidth: '400px', lineHeight: 1.6 }}>
                        Start adding games to your collection.
                    </p>
                </div>
            )}

            <FranchiseOverlay
                franchise={selectedFranchise}
                onClose={() => setSelectedFranchise(null)}
            />
        </div>
    );
};
