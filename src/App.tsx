import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WatchlistProvider } from './context/WatchlistContext';
import { GlobalSearchProvider } from './context/GlobalSearchContext';
import Layout from './components/Layout';
import Login from './pages/Login';
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

  if (loading) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">Loading...</div>;

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
                <Route path="upcoming" element={<Upcoming />} />
                <Route path="games" element={<Games />} />
                <Route path="dropped" element={<DroppedPage />} />
              </Route>
            </Routes>
          </GlobalSearchProvider>
        </WatchlistProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
