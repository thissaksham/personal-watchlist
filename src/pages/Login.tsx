import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Mail, Lock, ArrowRight, Loader, User, Globe } from 'lucide-react';
import { REGIONS } from '../lib/tmdb';

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

                // Even if "email confirmations" are on, the session might be null. 
                // But user requested "immediate access" so we assume they disabled confirmation.
                // If session is present -> Success.
                // If no session but no error -> "Check inbox" (fallback if they didn't disable it).

                if (data?.session) {
                    navigate('/');
                } else {
                    // Fallback just in case setting wasn't changed
                    alert('Account created! If not redirected, please check if email confirmation is required.');
                    setIsSignUp(false); // Switch to login view
                }

            } else {
                // Sign In Flow
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;

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
        primary: '#14b8a6', // Teal-500
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
            {/* Cinematic Background */}
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                backgroundImage: 'url("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.35) saturate(1.1)',
                transform: 'scale(1.05)' // Slight zoom for cinematic feel
            }} />

            {/* Content Container */}
            <div style={{
                position: 'relative',
                zIndex: 10,
                width: '100%',
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'row', // Default to row for desktop
                alignItems: 'center',
                justifyContent: 'space-between', // Split layout
                padding: '2rem',
                gap: '4rem',
                flexWrap: 'wrap' // Allow wrapping on mobile
            }}>

                {/* Branding Section */}
                <div style={{
                    flex: '1 1 500px', // Grow, shrink, basis
                    color: 'white',
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
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Watchlist</h1>
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
                        Sort by runtime, find streaming sources, and track your progress in style.
                    </p>
                </div>

                {/* Login Card */}
                <div style={{
                    flex: '0 1 450px',
                    width: '100%',
                    ...theme.glass,
                    padding: '3rem',
                    borderRadius: '24px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Ambient Glow */}
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

                        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {error && (
                                <div style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '8px',
                                    color: '#fca5a5',
                                    fontSize: '0.875rem'
                                }}>
                                    {error}
                                </div>
                            )}

                            {/* Name Input (Sign Up Only) */}
                            {isSignUp && (
                                <div style={{ position: 'relative', animation: 'fade-in-up 0.3s' }}>
                                    <User
                                        size={20}
                                        color={focusedInput === 'fullName' ? theme.primary : '#6b7280'}
                                        style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }}
                                    />
                                    <input
                                        type="text"
                                        required={isSignUp}
                                        placeholder="Full Name"
                                        onFocus={() => setFocusedInput('fullName')}
                                        onBlur={() => setFocusedInput(null)}
                                        style={{
                                            width: '100%',
                                            padding: '1rem 1rem 1rem 3rem',
                                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                            border: focusedInput === 'fullName' ? `1px solid ${theme.primary}` : '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            color: 'white',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'all 0.2s ease'
                                        }}
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Region Selection (Sign Up Only) */}
                            {isSignUp && (
                                <div style={{ position: 'relative', animation: 'fade-in-up 0.4s' }} ref={regionDropdownRef}>
                                    <Globe
                                        size={20}
                                        color={(focusedInput === 'region' || showRegionDropdown) ? theme.primary : '#6b7280'}
                                        style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s', zIndex: 10 }}
                                    />

                                    <div
                                        onClick={() => setShowRegionDropdown(!showRegionDropdown)}
                                        style={{
                                            width: '100%',
                                            padding: '1rem 1rem 1rem 3rem',
                                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                            border: (focusedInput === 'region' || showRegionDropdown) ? `1px solid ${theme.primary}` : '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            color: 'white',
                                            fontSize: '1rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <img
                                                src={`https://flagcdn.com/28x21/${selectedRegion.toLowerCase()}.png`}
                                                alt={selectedRegion}
                                                style={{ width: 24, height: 18, objectFit: 'cover', borderRadius: 2 }}
                                            />
                                            <span>{REGIONS.find(r => r.code === selectedRegion)?.name}</span>
                                        </div>
                                        <ArrowRight size={16} style={{ transform: showRegionDropdown ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform 0.3s', color: '#6b7280' }} />
                                    </div>

                                    {/* Custom Dropdown Content */}
                                    {showRegionDropdown && (
                                        <div className="dropdown-scroll-box" style={{
                                            position: 'absolute',
                                            bottom: 'calc(100% + 10px)', // Show above input to avoid being cut off
                                            left: 0,
                                            width: '100%',
                                            maxHeight: '200px',
                                            backgroundColor: '#121212',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            zIndex: 100,
                                            overflowY: 'auto',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                            padding: '0.5rem'
                                        }}>
                                            {REGIONS.map(r => (
                                                <div
                                                    key={r.code}
                                                    onClick={() => {
                                                        setSelectedRegion(r.code);
                                                        setShowRegionDropdown(false);
                                                    }}
                                                    style={{
                                                        padding: '0.75rem 1rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem',
                                                        cursor: 'pointer',
                                                        borderRadius: '8px',
                                                        transition: 'background 0.2s',
                                                        backgroundColor: selectedRegion === r.code ? 'rgba(20, 184, 166, 0.1)' : 'transparent',
                                                        color: selectedRegion === r.code ? theme.primary : '#d1d5db'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = selectedRegion === r.code ? 'rgba(20, 184, 166, 0.1)' : 'transparent'}
                                                >
                                                    <img
                                                        src={`https://flagcdn.com/28x21/${r.code.toLowerCase()}.png`}
                                                        alt={r.code}
                                                        style={{ width: 18, height: 14, objectFit: 'cover', borderRadius: 1 }}
                                                    />
                                                    <span style={{ fontSize: '0.9rem', fontWeight: selectedRegion === r.code ? 600 : 400 }}>{r.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{
                                        marginTop: '0.4rem',
                                        fontSize: '0.75rem',
                                        color: '#fbbf24',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}>
                                        <span style={{ fontWeight: 'bold' }}>⚠️ Permanent:</span> Region cannot be changed after signup.
                                    </div>
                                </div>
                            )}

                            {/* Email Input */}
                            <div style={{ position: 'relative' }}>
                                <Mail
                                    size={20}
                                    color={focusedInput === 'email' ? theme.primary : '#6b7280'}
                                    style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }}
                                />
                                <input
                                    type="email"
                                    required
                                    placeholder="Email address"
                                    onFocus={() => setFocusedInput('email')}
                                    onBlur={() => setFocusedInput(null)}
                                    style={{
                                        width: '100%',
                                        padding: '1rem 1rem 1rem 3rem',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: focusedInput === 'email' ? `1px solid ${theme.primary}` : '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            {/* Password Input */}
                            <div style={{ position: 'relative' }}>
                                <Lock
                                    size={20}
                                    color={focusedInput === 'password' ? theme.primary : '#6b7280'}
                                    style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', transition: 'color 0.2s' }}
                                />
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    placeholder="Password"
                                    onFocus={() => setFocusedInput('password')}
                                    onBlur={() => setFocusedInput(null)}
                                    style={{
                                        width: '100%',
                                        padding: '1rem 1rem 1rem 3rem',
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        border: focusedInput === 'password' ? `1px solid ${theme.primary}` : '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    marginTop: '1rem',
                                    width: '100%',
                                    padding: '1rem',
                                    backgroundColor: theme.primary,
                                    color: 'white',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    border: 'none',
                                    borderRadius: '12px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    transition: 'transform 0.2s, background-color 0.2s',
                                    boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)'
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

            {/* Mobile Responsive Helper */}
            <style>{`
                @media (max-width: 768px) {
                    div[style*="flex-direction: row"] {
                        flex-direction: column !important;
                        justify-content: center !important;
                        gap: 2rem !important;
                    }
                    div[style*="text-align: left"] {
                        text-align: center !important;
                    }
                    h1 { font-size: 1.5rem !important; }
                    h2 { font-size: 2.5rem !important; }
                    p { display: none !important; } /* Hide tagline on mobile */
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
