import { Clapperboard } from 'lucide-react';

interface FullPageLoaderProps {
  /** App name to display */
  appName?: string;
}

/**
 * Full Page Loader Component
 * Used during app initialization and authentication loading states.
 */
export const FullPageLoader = ({ appName = 'CineTrack' }: FullPageLoaderProps) => {
  return (
    <div className="fullpage-loader">
      <div className="fullpage-loader__icon">
        <Clapperboard size={32} color="var(--primary)" />
      </div>
      <h1 className="fullpage-loader__title">{appName}</h1>
    </div>
  );
};

export default FullPageLoader;
