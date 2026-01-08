/**
 * DOM Utilities
 * Common DOM manipulation and event handling utilities
 */

import { useEffect, type RefObject } from 'react';

/**
 * Hook to handle click outside events for dropdowns and modals
 */
export const useClickOutside = (
  ref: RefObject<HTMLElement>,
  handler: () => void
): void => {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, handler]);
};

/**
 * Sets the document title
 */
export const setDocumentTitle = (title: string, appName: string = 'CineTrack'): void => {
  document.title = `${appName} | ${title}`;
};

/**
 * Scrolls to top of page smoothly
 */
export const scrollToTop = (): void => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Checks if device supports hover
 */
export const supportsHover = (): boolean => {
  return window.matchMedia('(hover: hover)').matches;
};

/**
 * Checks if device is touch-enabled
 */
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};
