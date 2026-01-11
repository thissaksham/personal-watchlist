import { AppProviders } from './app/providers';
import { AppRouter } from './app/Router';

/**
 * App Component
 * Root component that sets up providers and routing.
 */
function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
