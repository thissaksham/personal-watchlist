import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Clapperboard, MonitorPlay, Calendar, Gamepad2, Menu, X, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SearchModal } from './SearchModal';
import { WatchlistModal } from './modals/WatchlistModal';
import type { TMDBMedia } from '../lib/tmdb';

export default function Layout() {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [recentlyAddedMedia, setRecentlyAddedMedia] = useState<TMDBMedia | null>(null);

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const navItems = [
        // Trending removed (Default Home)
        { name: 'Movies', path: '/movies', icon: Clapperboard },
        { name: 'Shows', path: '/shows', icon: MonitorPlay },
        { name: 'Upcoming', path: '/upcoming', icon: Calendar },
        { name: 'Games', path: '/games', icon: Gamepad2 },
    ];

    return (
        <div className="app-container">
            {/* Top Navbar */}
            <header className="navbar">

                {/* Left: Logo & Nav */}
                <div className="flex-center">
                    <NavLink to="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                        <Clapperboard size={24} strokeWidth={2.5} color="white" />
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>Watchlist</span>
                    </NavLink>

                    {/* Desktop Nav */}
                    <nav className="nav-links" style={{ display: 'none', marginLeft: '1rem' }}>
                        {/* Note: In pure CSS, handling 'md:flex' requires media queries on a class. 
                    I'll add specific responsive styles or inline style for simplicity if needed, 
                    but strictly I should use the CSS classes. 
                    For now, I'll rely on global CSS media queries targeting .nav-links.
                */}
                        {navItems.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            >
                                {item.name}
                            </NavLink>
                        ))}
                    </nav>
                    {/* Quick hack for desktop nav visibility since I removed Tailwind */}
                    <style>{`
                @media (min-width: 768px) {
                    .nav-links { display: flex !important; }
                    .mobile-toggle { display: none !important; }
                }
                @media (max-width: 767px) {
                    .nav-links { display: none; }
                }
            `}</style>
                </div>

                {/* Right: Add Button & Profile */}
                <div className="flex-center">
                    {/* Global Add Button (Elongated) */}
                    <button
                        className="navbar-add-btn"
                        onClick={() => setIsAddOpen(true)}
                        title="Add Movie or Show"
                    >
                        <Plus size={18} />
                        <span>Add Something new</span>
                    </button>

                    <div className="profile-pill">
                        <div className="avatar">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium hidden lg:block text-gray-300 max-w-[100px] truncate">
                            {/* Inline truncate logic or CSS */}
                            {user?.email?.split('@')[0]}
                        </span>
                    </div>

                    <button
                        onClick={handleSignOut}
                        title="Sign Out"
                        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                    >
                        <LogOut size={20} />
                    </button>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="mobile-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </header>

            {/* Mobile Nav Menu */}
            {mobileMenuOpen && (
                <div style={{ background: 'var(--surface)', padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', width: '100%' }}
                        >
                            <item.icon size={18} />
                            {item.name}
                        </NavLink>
                    ))}
                </div>
            )}

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>

            <SearchModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                type="multi"
                onSuccess={(media) => {
                    // Auto-open modal for Shows to allow marking seasons
                    if (media.media_type === 'tv') {
                        setRecentlyAddedMedia(media);
                    }
                }}
            />

            {recentlyAddedMedia && (
                <WatchlistModal
                    media={recentlyAddedMedia}
                    type="tv"
                    onClose={() => setRecentlyAddedMedia(null)}
                />
            )}
        </div>
    );
}
