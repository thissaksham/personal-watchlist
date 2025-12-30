import { useEffect, useState } from 'react';
import { Clapperboard } from 'lucide-react';

interface WelcomeSplashProps {
    type: 'welcome' | 'returning' | 'entry';
    onComplete: () => void;
}

export function WelcomeSplash({ type, onComplete }: WelcomeSplashProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [textVisible, setTextVisible] = useState(false);

    const isReturning = type === 'returning';
    const isEntry = type === 'entry';

    // Durations: welcome (4s), returning (2s), entry (1s)
    const duration = isEntry ? 1000 : (isReturning ? 2000 : 4000);
    const textDelay = isEntry ? 100 : (isReturning ? 300 : 1000);
    const exitDelay = isEntry ? 800 : (isReturning ? 1500 : 3500);

    useEffect(() => {
        const textTimer = setTimeout(() => setTextVisible(true), textDelay);
        const exitTimer = setTimeout(() => setIsVisible(false), exitDelay);
        const completeTimer = setTimeout(onComplete, duration);

        return () => {
            clearTimeout(textTimer);
            clearTimeout(exitTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete, type, duration, textDelay, exitDelay]);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isEntry ? '1rem' : '2rem',
            transition: 'opacity 0.4s ease-in-out',
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? 'all' : 'none',
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* Pulsing Clapperboard */}
            <div style={{
                padding: isEntry ? '1rem' : (isReturning ? '1.5rem' : '2rem'),
                background: 'rgba(20, 184, 166, 0.1)',
                borderRadius: '32px',
                border: '1px solid rgba(20, 184, 166, 0.2)',
                animation: 'pulse-grow 2s infinite ease-in-out'
            }}>
                <Clapperboard size={isEntry ? 32 : (isReturning ? 48 : 64)} color="#14b8a6" />
            </div>

            {/* Cinematic Text */}
            {!isEntry ? (
                <div style={{
                    textAlign: 'center',
                    transition: 'all 0.8s ease-out',
                    opacity: textVisible ? 1 : 0,
                    transform: textVisible ? 'translateY(0)' : 'translateY(15px)'
                }}>
                    <h2 style={{
                        color: 'white',
                        fontSize: isReturning ? '1.5rem' : '2.5rem',
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem',
                        textTransform: 'uppercase'
                    }}>
                        {isReturning ? 'Welcome back to the' : 'Welcome to the'}
                    </h2>
                    <h1 style={{
                        fontSize: isReturning ? '2.5rem' : '4rem',
                        fontWeight: 900,
                        background: 'linear-gradient(90deg, #14b8a6, #3b82f6)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase'
                    }}>
                        World of Cinema
                    </h1>
                </div>
            ) : (
                <div style={{
                    transition: 'opacity 0.5s ease-out',
                    opacity: textVisible ? 1 : 0,
                }}>
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        color: 'white',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase'
                    }}>
                        CineTrack
                    </h1>
                </div>
            )}

            <style>{`
                @keyframes pulse-grow {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
            `}</style>
        </div>
    );
}
