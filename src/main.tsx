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
        <div style={{ padding: 20, color: 'red', background: '#fff', border: '2px solid red', margin: 20 }}>
          <h1>Something went wrong.</h1>
          <h2 style={{ color: 'black' }}>Error: {this.state.error?.toString()}</h2>
          <pre style={{ background: '#eee', padding: 10, overflow: 'auto' }}>{this.state.error?.stack}</pre>
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
