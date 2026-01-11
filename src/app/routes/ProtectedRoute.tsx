import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { FullPageLoader } from '../../shared/components/feedback';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected Route Wrapper
 * Redirects unauthenticated users to the login page.
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
