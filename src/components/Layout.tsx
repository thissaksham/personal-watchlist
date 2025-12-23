import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Clapperboard, MonitorPlay, Calendar, Gamepad2, Menu, X, Plus, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SearchModal } from './SearchModal';
import { WatchlistModal } from './modals/WatchlistModal';
import { ChangePasswordModal } from './modals/ChangePasswordModal';
// No regional logic needed in header
import type { TMDBMedia } from '../lib/tmdb';

export default function Layout() {
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [recentlyAddedMedia, setRecentlyAddedMedia] = useState<TMDBMedia | null>(null);

    // Dropdown State
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const navItems = [
        { name: 'Movies', path: '/movies', icon: Clapperboard },
        { name: 'Shows', path: '/shows', icon: MonitorPlay },
        { name: 'Upcoming', path: '/upcoming', icon: Calendar },
        { name: 'Games', path: '/games', icon: Gamepad2 },
        { name: 'Dropped', path: '/dropped', icon: LogOut },
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

                    <nav className="nav-links" style={{ display: 'none', marginLeft: '1rem' }}>
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
                <div className="flex-center" style={{ gap: '0.5rem' }}>
                    {/* Global Add Button (Elongated) */}
                    <button
                        className="navbar-add-btn"
                        onClick={() => setIsAddOpen(true)}
                        title="Add Movie or Show"
                        style={{ marginRight: 0 }}
                    >
                        <Plus size={18} />
                        <span>Add Something new</span>
                    </button>

                    {/* User Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button
                            className="profile-pill hover:bg-white/10 transition-colors"
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="avatar">
                                {user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium hidden lg:block text-gray-300 max-w-[100px] truncate">
                                {user?.email?.split('@')[0]}
                            </span>
                        </button>

                        {/* Dropdown Menu */}
                        {isUserMenuOpen && (
                            <div className="user-dropdown-menu">
                                <div className="dropdown-section">
                                    <p className="dropdown-label">Account</p>
                                    <p className="dropdown-value" title={user?.email}>{user?.email}</p>
                                </div>

                                <button
                                    onClick={() => { setIsUserMenuOpen(false); setShowPasswordModal(true); }}
                                    className="dropdown-btn"
                                >
                                    <Lock size={16} /> Change Password
                                </button>

                                <div className="dropdown-divider"></div>

                                <button
                                    onClick={handleSignOut}
                                    className="dropdown-btn danger"
                                >
                                    <LogOut size={16} /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>

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

            {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
        </div>
    );
}
