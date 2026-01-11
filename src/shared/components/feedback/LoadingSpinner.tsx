import { Clapperboard } from 'lucide-react';

interface LoadingSpinnerProps {
  /** Size of the spinner icon */
  size?: 'sm' | 'md' | 'lg';
  /** Optional message to display below the spinner */
  message?: string;
  /** Whether to show the full-screen loading overlay */
  fullScreen?: boolean;
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
};

/**
 * Loading Spinner Component
 * Displays a pulsing animation with the app icon during loading states.
 */
export const LoadingSpinner = ({ 
  size = 'md', 
  message,
  fullScreen = false 
}: LoadingSpinnerProps) => {
  const iconSize = sizeMap[size];

  const content = (
    <div className="loading-spinner">
      <div className="loading-spinner__icon">
        <Clapperboard size={iconSize} color="var(--primary)" />
      </div>
      {message && (
        <p className="loading-spinner__message">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-spinner--fullscreen">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
