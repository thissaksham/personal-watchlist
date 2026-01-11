import { RotateCw } from 'lucide-react';

export const SyncOverlay = () => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem',
                padding: '2rem',
                borderRadius: '16px',
                backgroundColor: '#1a1a1a',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                maxWidth: '350px',
                textAlign: 'center',
                color: 'white'
            }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        position: 'absolute',
                        width: '60px',
                        height: '60px',
                        backgroundColor: 'rgba(20, 184, 166, 0.2)',
                        borderRadius: '50%',
                        filter: 'blur(20px)'
                    }} />
                    <RotateCw
                        size={48}
                        color="#14b8a6"
                        style={{
                            position: 'relative',
                            zIndex: 10,
                            animation: 'spin 1s linear infinite'
                        }}
                    />
                </div>

                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Syncing Library</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: '1.5' }}>
                        Refreshing metadata for your movies and shows. This may take a moment...
                    </p>
                </div>
            </div>
        </div>
    );
};
