import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../../lib/react-query/client';
import { AuthProvider } from '../../features/auth/context/AuthContext';
import { WatchlistProvider } from '../../features/watchlist/context/WatchlistContext';
import { PreferencesProvider } from '../../context/PreferencesContext';
import { GlobalSearchProvider } from '../../context/GlobalSearchContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * App Providers Component
 * Wraps the application with all necessary context providers.
 * Order matters: providers that depend on others should be nested inside them.
 */
export const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PreferencesProvider>
            <WatchlistProvider>
              <GlobalSearchProvider>
                {children}
              </GlobalSearchProvider>
            </WatchlistProvider>
          </PreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default AppProviders;
