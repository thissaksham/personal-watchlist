import React from 'react';
import { Gamepad2 } from 'lucide-react';

export const GamesPage = () => {
    return (
        <div style={{
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '70vh',
            color: '#94a3b8',
            textAlign: 'center'
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '2rem',
                borderRadius: '50%',
                marginBottom: '1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <Gamepad2 size={48} color="#14b8a6" />
            </div>
            <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Games Library
            </h1>
            <p style={{ maxWidth: '400px', lineHeight: 1.6 }}>
                Track your gaming collection. This feature is currently under development and will be available soon.
            </p>
        </div>
    );
};
