import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, ExternalLink } from 'lucide-react';

export default function VerifySuccess() {
    useEffect(() => {
        // Auto sign out on this device (usually phone)
        // to prevent the session from persisting where verify was clicked.
        const clearSession = async () => {
            await supabase.auth.signOut();
        };
        clearSession();
    }, []);

    const theme = {
        primary: '#14b8a6',
        glass: {
            background: 'rgba(22, 22, 22, 0.7)',
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
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000',
            fontFamily: "'Inter', sans-serif",
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Cinematic Background */}
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                backgroundImage: 'url("https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.2) saturate(0.8)',
                transform: 'scale(1.1)'
            }} />

            {/* Ambient Glows */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '120%',
                height: '120%',
                background: 'radial-gradient(circle, rgba(20,184,166,0.05) 0%, transparent 70%)',
                filter: 'blur(100px)',
                transform: 'translate(-50%, -50%)',
                zIndex: 1,
                pointerEvents: 'none'
            }} />

            <div style={{
                ...theme.glass,
                padding: '3.5rem 2.5rem',
                borderRadius: '32px',
                maxWidth: '450px',
                width: '90%',
                textAlign: 'center',
                position: 'relative',
                zIndex: 10,
                animation: 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div style={{
                    width: '84px',
                    height: '84px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 2rem',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    boxShadow: '0 0 40px rgba(34, 197, 94, 0.1)'
                }}>
                    <CheckCircle size={44} color="#22c55e" />
                </div>

                <h1 style={{
                    color: 'white',
                    fontSize: '2.25rem',
                    fontWeight: 800,
                    marginBottom: '1rem',
                    letterSpacing: '-0.02em'
                }}>
                    Successfully Verified
                </h1>

                <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                    Your account is now active. We've logged you out of this device to keep your session secure.
                </p>

                <div style={{
                    padding: '1.5rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        padding: '0.75rem',
                        background: 'rgba(20, 184, 166, 0.15)',
                        borderRadius: '12px',
                        display: 'flex'
                    }}>
                        <ExternalLink size={24} color={theme.primary} />
                    </div>
                    <div>
                        <p style={{ color: 'white', fontSize: '1rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                            Next Step:
                        </p>
                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
                            Return to your <strong>original browser</strong> or <strong>laptop</strong> to continue to your watchlist.
                        </p>
                    </div>
                </div>

                {/* Footer Logo */}
                <div style={{ marginTop: '3rem', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '20px', height: '20px', background: theme.primary, borderRadius: '4px' }} />
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em' }}>WATCHLIST</span>
                </div>
            </div>

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
