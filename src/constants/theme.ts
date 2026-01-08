/**
 * Theme Constants
 * Centralized theme values for consistent styling across the application
 */

export const theme = {
  colors: {
    primary: '#14b8a6',
    primaryHover: '#0d9488',
    background: '#121212',
    surface: '#1e1e1e',
    surfaceHover: '#2a2a2a',
    textPrimary: '#f3f4f6',
    textSecondary: '#9ca3af',
    border: '#374151',
    error: '#ef4444',
    errorHover: '#dc2626',
    success: '#10b981',
    warning: '#fbbf24',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '999px',
  },
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 25px rgba(0, 0, 0, 0.5)',
    xl: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  glass: {
    background: 'rgba(22, 22, 22, 0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  transitions: {
    fast: '0.2s',
    normal: '0.3s',
    slow: '0.4s',
  },
} as const;

export type Theme = typeof theme;
