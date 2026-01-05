import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query/client';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';
import { WatchlistProvider } from './features/watchlist/context/WatchlistContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { GlobalSearchProvider } from './context/GlobalSearchContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import { Clapperboard } from 'lucide-react';

import { Movies } from './pages/Movies';
import { Shows } from './pages/Shows';
import { Upcoming } from './pages/Upcoming';
import { GamesPage } from './features/games/pages/GamesPage';
import VerifySuccess from './pages/VerifySuccess';


// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{
      height: '100vh',
      width: '100%',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      fontFamily: "'Outfit', sans-serif"
    }}>
      <div style={{
        padding: '1rem',
        background: 'rgba(20, 184, 166, 0.1)',
        borderRadius: '32px',
        border: '1px solid rgba(20, 184, 166, 0.2)',
        animation: 'pulse 2s infinite ease-in-out'
      }}>
        <Clapperboard size={32} color="#14b8a6" />
      </div>
      <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        CineTrack
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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// App core logic
function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PreferencesProvider>
            <WatchlistProvider>
              <GlobalSearchProvider>
                <Routes>
                  <Route path="/auth" element={<Login />} />
                  <Route path="/auth/verified" element={<VerifySuccess />} />


                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Navigate to="/upcoming/onOTT" replace />} />

                    {/* Movies Tab with URL State */}
                    <Route path="movies" element={<Navigate to="/movies/unwatched" replace />} />
                    <Route path="movies/:status" element={<Movies />} />

                    <Route path="shows" element={<Navigate to="/shows/watching" replace />} />
                    <Route path="shows/:status" element={<Shows />} />

                    {/* Upcoming Tab with URL State */}
                    <Route path="upcoming" element={<Navigate to="/upcoming/onOTT" replace />} />
                    <Route path="upcoming/:status" element={<Upcoming />} />


                    <Route path="games" element={<GamesPage />} />
                  </Route>

                  {/* 404 Catch-All -> Redirect to Home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </GlobalSearchProvider>
            </WatchlistProvider>
          </PreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
