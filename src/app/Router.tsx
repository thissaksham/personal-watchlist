import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Layouts
import { Layout } from '../features/header/Layout';

// Auth Pages
import Login from '../pages/Login';
import VerifySuccess from '../pages/VerifySuccess';

// Feature Pages
import { MoviesPage } from '../features/movies/pages/MoviesPage';
import { ShowsPage } from '../features/shows/pages/ShowsPage';
import { UpcomingPage } from '../features/upcoming/pages/UpcomingPage';
import { GamesPage } from '../features/games/pages/GamesPage';

/**
 * App Router
 * Centralized route definitions for the application.
 */
export const AppRouter = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/auth" element={<Login />} />
      <Route path="/auth/verified" element={<VerifySuccess />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Default redirect */}
        <Route index element={<Navigate to="/upcoming/onOTT" replace />} />

        {/* Movies Routes */}
        <Route path="movies" element={<Navigate to="/movies/unwatched" replace />} />
        <Route path="movies/:status" element={<MoviesPage />} />

        {/* Shows Routes */}
        <Route path="shows" element={<Navigate to="/shows/watching" replace />} />
        <Route path="shows/:status" element={<ShowsPage />} />

        {/* Upcoming Routes */}
        <Route path="upcoming" element={<Navigate to="/upcoming/onOTT" replace />} />
        <Route path="upcoming/:status" element={<UpcomingPage />} />

        {/* Games Routes */}
        <Route path="games" element={<Navigate to="/games/unplayed" replace />} />
        <Route path="games/:status" element={<GamesPage />} />
      </Route>

      {/* 404 Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
