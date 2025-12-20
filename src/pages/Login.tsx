import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, Mail, Lock, ArrowRight, Loader } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleAuth = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Priority 1: Sign In
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (!signInError) {
                // Success - Redirect
                setIsVerifying(false);
                navigate('/');
                return;
            }

            // Priority 2: Handle Unverified Account
            if (signInError.message.includes('Email not confirmed') || signInError.message.includes('email_not_confirmed')) {
                setIsVerifying(true);
                throw new Error('Email not yet verified. Please check your inbox or click the link on your phone.');
            }

            // Priority 3: Sign Up (if user doesn't exist)
            if (signInError.message.includes('Invalid login credentials')) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin + '/auth/verified'
                    }
                });

                if (signUpError) {
                    // If sign-up also fails, it might be a genuinely invalid credential/format
                    throw signUpError;
                }

                // Sign-up success - Show verification view
                setIsVerifying(true);
                return;
            }

            // Otherwise, it's a generic error (e.g. wrong password for existing user)
            throw signInError;

        } catch (err: any) {
            setError(err.message);
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
                        {isVerifying ? (
                            <div style={{ textAlign: 'center', animation: 'fade-in-up 0.5s ease' }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    background: 'rgba(20, 184, 166, 0.1)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 2rem',
                                    border: '1px solid rgba(20, 184, 166, 0.2)'
                                }}>
                                    <Mail size={40} color={theme.primary} />
                                </div>
                                <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>
                                    Check your Inbox
                                </h3>
                                <p style={{ color: theme.textMuted, marginBottom: '2rem', lineHeight: 1.6 }}>
                                    We've sent a verification link to <br />
                                    <strong style={{ color: 'white' }}>{email}</strong>.
                                </p>

                                <div style={{
                                    padding: '1rem',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '12px',
                                    fontSize: '0.875rem',
                                    color: '#94a3b8',
                                    marginBottom: '2rem',
                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                    Once verified, you can return here to sign in.
                                </div>

                                {error && (
                                    <div style={{
                                        padding: '0.75rem',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: '8px',
                                        color: '#fca5a5',
                                        fontSize: '0.875rem',
                                        marginBottom: '1.5rem'
                                    }}>
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={() => handleAuth()}
                                    disabled={loading}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: theme.primary,
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: 'white',
                                        fontWeight: 600,
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                    onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                    onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                                >
                                    {loading ? (
                                        <>
                                            <Loader size={20} className="animate-spin" />
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            Continue to Watchlist
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => setIsVerifying(false)}
                                    style={{
                                        marginTop: '1rem',
                                        background: 'none',
                                        border: 'none',
                                        color: theme.textMuted,
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Back to Login
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
                                        Secure Access
                                    </h3>
                                    <p style={{ color: theme.textMuted }}>
                                        Enter your credentials to continue or create an account.
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
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader size={20} className="animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Continue
                                                <ArrowRight size={20} />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: theme.textMuted }}>
                                    Your account will be automatically created if it doesn't exist.
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Responsive Helper (using styled-jsx logic via style tag for media queries) */}
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
                    p { display: none !important; } /* Hide tagline on mobile to save space */
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
