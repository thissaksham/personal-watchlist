import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Mail, Lock, ArrowRight, Loader, User, Globe } from 'lucide-react';
import { REGIONS } from '../lib/tmdb';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';

export default function Login() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = useState('IN');
    const [showRegionDropdown, setShowRegionDropdown] = useState(false);
    const regionDropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { setRegion } = usePreferences();

    // Redirect if already logged in
    useEffect(() => {
        if (user && !authLoading) {
            navigate('/', { replace: true });
        }
    }, [user, authLoading, navigate]);

    // Sync tab title
    useEffect(() => {
        document.title = 'CineTrack | Authentication';
    }, []);

    // Close region dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node)) {
                setShowRegionDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                // Sign Up Flow
                const { error: signUpError, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            region: selectedRegion
                        }
                    }
                });

                if (signUpError) throw signUpError;

                if (data?.session) {
                    // Reactive Sync: Update region without reload
                    setRegion(selectedRegion);

                    // Trigger Welcome Splash for first time users
                    sessionStorage.setItem('show_welcome', 'true');
                    sessionStorage.setItem('splash_type', 'welcome');
                    navigate('/');
                } else {
                    alert('Account created! If not redirected, please check if email confirmation is required.');
                    setIsSignUp(false);
                }

            } else {
                // Sign In Flow
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;
                // Trigger shorter Welcome Back splash for returning users
                sessionStorage.setItem('show_welcome', 'true');
                sessionStorage.setItem('splash_type', 'returning');
                // Note: AuthContext/PreferencesContext will handle region reactive sync for existing users automatically
                navigate('/');
            }

        } catch (err: any) {
            console.error("Auth Error:", err);
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    // Inline Styles System
    const theme = {
        primary: '#14b8a6',
        primaryHover: '#0d9488',
        surface: 'rgba(20, 20, 20, 0.7)',
        border: 'rgba(255, 255, 255, 0.1)',
        textMain: '#ffffff',
        textMuted: '#9ca3af',
        glass: {
            background: 'rgba(22, 22, 22, 0.6)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }
    };

    // Splash mask
    if (authLoading || user) {
        return (
            <div style={{
                height: '100vh',
                width: '100%',
                backgroundColor: '#000',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.5rem'
            }}>
                <div style={{
                    padding: '1.5rem',
                    background: 'rgba(20, 184, 166, 0.1)',
                    borderRadius: '24px',
                    border: '1px solid rgba(20, 184, 166, 0.2)',
                    animation: 'pulse 2s infinite ease-in-out'
                }}>
                    <Clapperboard size={48} color={theme.primary} />
                </div>
                <h1 style={{
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    fontFamily: "'Outfit', sans-serif"
                }}>
                    CINETRACK
                </h1>
                <style>{`
                    @keyframes pulse {
                        0% { transform: scale(1); opacity: 0.8; }
                        50% { transform: scale(1.1); opacity: 1; }
                        100% { transform: scale(1); opacity: 0.8; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#000',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                backgroundImage: 'url("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.35) saturate(1.1)',
                transform: 'scale(1.05)'
            }} />

            <div style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2rem',
                gap: '4rem',
            }}>
                <div style={{
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            padding: '0.75rem',
                            background: 'rgba(20, 184, 166, 0.2)',
                            borderRadius: '12px',
                            border: '1px solid rgba(20, 184, 166, 0.3)',
                            display: 'flex'
                        }}>
                            <Clapperboard size={32} color={theme.primary} />
                        </div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>CineTrack</h1>
                    </div>

                    <h2 style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.1 }}>
                        Your Cinema, <br />
                        <span style={{
                            color: 'transparent',
                            backgroundImage: 'linear-gradient(90deg, #2dd4bf, #3b82f6)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text'
                        }}>
                            Unlimited.
                        </span>
                    </h2>

                    <p style={{ fontSize: '1.125rem', color: '#d1d5db', maxWidth: '500px', lineHeight: 1.6 }}>
                        The ultimate personal tracking library for movies and TV shows.
                    </p>
                </div>

                <div style={{
                    flex: '0 1 450px',
                    width: '100%',
                    maxWidth: '450px',
                    ...theme.glass,
                    padding: '3rem',
                    borderRadius: '24px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '-50%',
                        right: '-50%',
                        width: '100%',
                        height: '100%',
                        background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)',
                        filter: 'blur(60px)',
                        pointerEvents: 'none'
                    }} />

                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
                                {isSignUp ? 'Create Account' : 'Welcome Back'}
                            </h3>
                            <p style={{ color: theme.textMuted }}>
                                {isSignUp ? 'Join now to start tracking your library.' : 'Enter your credentials to continue.'}
                            </p>
                        </div>

                        {error && (
                            <div style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                padding: '1rem',
                                borderRadius: '12px',
                                marginBottom: '1.5rem',
                                fontSize: '0.9rem'
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {isSignUp && (
                                <div style={{ position: 'relative' }}>
                                    <User size={18} color={focusedInput === 'name' ? theme.primary : '#6b7280'} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }} />
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        onFocus={() => setFocusedInput('name')}
                                        onBlur={() => setFocusedInput(null)}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem 0.875rem 2.75rem',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            border: `1px solid ${focusedInput === 'name' ? theme.primary : 'rgba(255,255,255,0.08)'}`,
                                            borderRadius: '12px',
                                            color: 'white',
                                            outline: 'none',
                                            transition: 'all 0.2s'
                                        }}
                                    />
                                </div>
                            )}

                            <div style={{ position: 'relative' }}>
                                <Mail size={18} color={focusedInput === 'email' ? theme.primary : '#6b7280'} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }} />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedInput('email')}
                                    onBlur={() => setFocusedInput(null)}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem 0.875rem 2.75rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        border: `1px solid ${focusedInput === 'email' ? theme.primary : 'rgba(255,255,255,0.08)'}`,
                                        borderRadius: '12px',
                                        color: 'white',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <Lock size={18} color={focusedInput === 'pass' ? theme.primary : '#6b7280'} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }} />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedInput('pass')}
                                    onBlur={() => setFocusedInput(null)}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem 0.875rem 2.75rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        border: `1px solid ${focusedInput === 'pass' ? theme.primary : 'rgba(255,255,255,0.08)'}`,
                                        borderRadius: '12px',
                                        color: 'white',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                />
                            </div>

                            {isSignUp && (
                                <div style={{ position: 'relative' }} ref={regionDropdownRef}>
                                    <Globe size={18} color={showRegionDropdown ? theme.primary : '#6b7280'} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                    <button
                                        type="button"
                                        onClick={() => setShowRegionDropdown(!showRegionDropdown)}
                                        style={{
                                            width: '100%',
                                            padding: '0.875rem 1rem 0.875rem 2.75rem',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            border: `1px solid ${showRegionDropdown ? theme.primary : 'rgba(255,255,255,0.08)'}`,
                                            borderRadius: '12px',
                                            color: 'white',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <span>
                                            <img
                                                src={`https://flagcdn.com/w40/${selectedRegion.toLowerCase()}.png`}
                                                alt={selectedRegion}
                                                style={{ width: '24px', height: 'auto', borderRadius: '2px', objectFit: 'cover' }}
                                            />
                                            <span style={{ marginLeft: '10px' }}>{REGIONS.find(r => r.code === selectedRegion)?.name}</span>
                                        </span>
                                        <ArrowRight size={16} style={{ transform: showRegionDropdown ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                    </button>

                                    {showRegionDropdown && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: 0,
                                            width: '100%',
                                            backgroundColor: '#1a1a1a',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            marginBottom: '0.5rem',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            zIndex: 20,
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                        }}>
                                            {REGIONS.map(r => (
                                                <button
                                                    key={r.code}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedRegion(r.code);
                                                        setShowRegionDropdown(false);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.75rem 1rem',
                                                        textAlign: 'left',
                                                        backgroundColor: selectedRegion === r.code ? 'rgba(20, 184, 166, 0.1)' : 'transparent',
                                                        border: 'none',
                                                        color: selectedRegion === r.code ? theme.primary : 'white',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                    }}
                                                >
                                                    <img
                                                        src={`https://flagcdn.com/w40/${r.code.toLowerCase()}.png`}
                                                        alt={r.name}
                                                        style={{ width: '24px', height: 'auto', borderRadius: '2px', objectFit: 'cover' }}
                                                    />
                                                    <span>{r.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    backgroundColor: theme.primary,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    transition: 'all 0.2s',
                                    opacity: loading ? 0.7 : 1,
                                    boxShadow: `0 4px 14px 0 rgba(20, 184, 166, 0.39)`
                                }}
                                onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                {loading ? (
                                    <>
                                        <Loader size={20} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {isSignUp ? 'Create Account' : 'Sign In'}
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: theme.textMuted }}>
                            {isSignUp ? "Already have an account?" : "Don't have an account?"}
                            <button
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError(null);
                                    setFullName('');
                                    setFocusedInput(null);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: theme.primary,
                                    fontWeight: 600,
                                    marginLeft: '0.5rem',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            >
                                {isSignUp ? "Sign In" : "Sign Up"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 900px) {
                    div[style*="flex-direction: row"] {
                        flex-direction: column !important;
                        justify-content: center !important;
                        gap: 2rem !important;
                        padding-top: 4rem !important;
                    }
                    div[style*="text-shadow"] {
                        text-align: center !important;
                        margin-bottom: 2rem;
                    }
                    div[style*="max-width: 500px"] {
                        margin: 0 auto;
                    }
                    h2 { font-size: 2.5rem !important; }
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
            `}</style>
        </div>
    );
}
