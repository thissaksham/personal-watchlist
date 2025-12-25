import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WatchlistProvider } from './context/WatchlistContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { GlobalSearchProvider } from './context/GlobalSearchContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import { Clapperboard } from 'lucide-react';
import { Trending } from './pages/Trending';
import { Movies } from './pages/Movies';
import { Shows } from './pages/Shows';
import { Upcoming } from './pages/Upcoming';
import { Games } from './pages/Placeholders';
import VerifySuccess from './pages/VerifySuccess';
import { DroppedPage } from './pages/DroppedPage';


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
        padding: '1.5rem',
        background: 'rgba(20, 184, 166, 0.1)',
        borderRadius: '24px',
        border: '1px solid rgba(20, 184, 166, 0.2)',
        animation: 'pulse 2s infinite ease-in-out'
      }}>
        <Clapperboard size={48} color="#14b8a6" />
      </div>
      <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.1em' }}>
        CINETRACK
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

function App() {
  console.log("App component rendering...");
  return (
    <BrowserRouter>
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
                  <Route index element={<Trending />} />
                  <Route path="movies" element={<Movies />} />
                  <Route path="shows" element={<Shows />} />
                  <Route path="upcoming" element={<Upcoming />} />
                  <Route path="games" element={<Games />} />
                  <Route path="dropped" element={<DroppedPage />} />
                </Route>
              </Routes>
            </GlobalSearchProvider>
          </WatchlistProvider>
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
