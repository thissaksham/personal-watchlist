# Quick Reference Guide

## 🚀 Common Patterns

### Import Constants
```typescript
import { theme } from '@/constants/theme';
import { ROUTES } from '@/constants/routes';
import { MOVIE_STATUSES, SHOW_STATUSES } from '@/constants/status';
```

### Import Utilities
```typescript
// All utilities
import { formatDisplayDate, getPosterUrl, isValidEmail } from '@/utils';

// Or specific
import { formatDisplayDate } from '@/utils/formatting';
import { getPosterUrl } from '@/utils/imageUtils';
```

### Use Hooks
```typescript
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useClickOutside } from '@/utils/domUtils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// In component
useDocumentTitle('Page Title');
const isMobile = useMediaQuery('(max-width: 768px)');
```

### Style with CSS Modules
```typescript
import styles from './Component.module.css';

<div className={styles.container}>
  <button className={styles.button}>Click</button>
</div>
```

### Combine Classes
```typescript
import { cn } from '@/utils/cn';

<div className={cn(styles.base, isActive && styles.active, className)}>
```

## 📦 Component Structure Template

```typescript
import React from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/Button';
import styles from './Component.module.css';
import type { SomeType } from '@/types';

interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export const Component: React.FC<ComponentProps> = ({ 
  title, 
  onAction 
}) => {
  useDocumentTitle(title);
  
  return (
    <div className={styles.container}>
      <h1>{title}</h1>
      {onAction && <Button onClick={onAction}>Action</Button>}
    </div>
  );
};
```

## 🎨 Theme Usage

```typescript
import { theme } from '@/constants/theme';

// In CSS (use CSS variables)
.container {
  background-color: var(--primary);
  padding: var(--spacing-md);
}

// In TypeScript
const color = theme.colors.primary;
const spacing = theme.spacing.md;
```

## 🔗 Route Navigation

```typescript
import { ROUTES } from '@/constants/routes';
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate(ROUTES.MOVIES);
```

## ✅ Status Checks

```typescript
import { MOVIE_STATUSES, SHOW_STATUSES } from '@/constants/status';

if (item.status === MOVIE_STATUSES.WATCHED) {
  // ...
}
```

## 🖼️ Image Handling

```typescript
import { getPosterUrl, getBackdropUrl, getFlagUrl } from '@/utils/imageUtils';

const poster = getPosterUrl(media.poster_path, media.title);
const backdrop = getBackdropUrl(media.backdrop_path);
const flag = getFlagUrl('US');
```

## 📅 Date Formatting

```typescript
import { formatDisplayDate, formatYear } from '@/utils/formatting';

const formatted = formatDisplayDate('2024-01-15'); // "Jan 15, '24"
const year = formatYear('2024-01-15'); // "2024"
```

## 🎯 Button Variants

```typescript
import { Button } from '@/components/ui/Button';

<Button variant="primary" size="large">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="danger">Delete</Button>
<Button variant="ghost">Ghost</Button>
```

## 📱 Responsive Design

```typescript
import { useMediaQuery } from '@/hooks/useMediaQuery';

const isMobile = useMediaQuery('(max-width: 768px)');
const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
```

## 🔍 Validation

```typescript
import { isValidEmail, isValidPassword } from '@/utils/validation';

if (isValidEmail(email)) {
  // Valid email
}
```

## 💾 Local Storage

```typescript
import { useLocalStorage } from '@/hooks/useLocalStorage';

const [value, setValue] = useLocalStorage('key', 'default');
```

## 🎭 Media Card

```typescript
import { MediaCard } from '@/components/shared/MediaCard';

<MediaCard
  media={movie}
  onClick={handleClick}
  showRating
  showYear
  showDuration
/>
```
