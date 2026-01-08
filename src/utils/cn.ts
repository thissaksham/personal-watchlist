/**
 * Class Name Utility
 * Combines class names with conditional logic (similar to clsx/classnames)
 */

type ClassValue = string | number | boolean | undefined | null | Record<string, boolean>;

export const cn = (...classes: ClassValue[]): string => {
  return classes
    .filter(Boolean)
    .map((cls) => {
      if (typeof cls === 'string') return cls;
      if (typeof cls === 'object' && cls !== null) {
        return Object.entries(cls)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key)
          .join(' ');
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
};
