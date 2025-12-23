import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary caught an error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          backgroundColor: '#121212',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: "'Outfit', sans-serif"
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#14b8a6' }}>Oops!</h1>
          <p style={{ fontSize: '1.2rem', color: '#9ca3af', maxWidth: '600px', marginBottom: '2rem' }}>
            CineTrack encountered an unexpected error. Don't worry, your data is safe. Try refreshing the page.
          </p>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'left',
            width: '100%',
            maxWidth: '800px',
            overflow: 'auto',
            maxHeight: '40vh'
          }}>
            <code style={{ fontSize: '0.9rem', color: '#f87171' }}>
              {this.state.error?.toString()}
            </code>
            <pre style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
              {this.state.error?.stack}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '2rem',
              padding: '0.75rem 2rem',
              backgroundColor: '#14b8a6',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

console.log("Main.tsx running, finding root...");
const rootElement = document.getElementById('root');
console.log("Root element found:", rootElement);

createRoot(rootElement!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
