/**
 * Hook to manage document title
 */
import { useEffect } from 'react';

export const useDocumentTitle = (title: string, appName: string = 'CineTrack'): void => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${appName} | ${title}`;
    
    return () => {
      document.title = previousTitle;
    };
  }, [title, appName]);
};
