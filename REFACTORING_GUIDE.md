# Codebase Refactoring Guide

This guide explains the improved codebase structure for better maintainability and readability.

## 📁 New Directory Structure

```
src/
├── constants/          # Shared constants and configuration
│   ├── theme.ts       # Theme colors, spacing, shadows
│   ├── routes.ts      # Route definitions
│   └── status.ts       # Status constants
├── utils/             # Pure utility functions
│   ├── formatting.ts  # Date, number, text formatting
│   ├── imageUtils.ts  # Image URL generation
│   ├── domUtils.ts    # DOM manipulation utilities
│   ├── validation.ts  # Validation functions
│   └── cn.ts          # Class name utility
├── hooks/             # Reusable React hooks
│   ├── useDocumentTitle.ts
│   ├── useMediaQuery.ts
│   └── useLocalStorage.ts
├── components/
│   ├── ui/            # Basic UI components (Button, etc.)
│   └── shared/        # Shared complex components
├── styles/
│   └── components/    # CSS modules for components
└── features/          # Feature-based modules (unchanged)
```

## 🎯 Key Improvements

### 1. **Constants Extraction**
All magic strings, theme values, and configuration are now centralized:

```typescript
// Before
const primaryColor = '#14b8a6';
const route = '/movies';

// After
import { theme } from '@/constants/theme';
import { ROUTES } from '@/constants/routes';
const primaryColor = theme.colors.primary;
const route = ROUTES.MOVIES;
```

### 2. **Utility Functions**
Common functions are extracted into dedicated modules:

```typescript
// Before (scattered across components)
const formatDate = (date) => { /* ... */ }
const getPosterUrl = (path) => { /* ... */ }

// After
import { formatDisplayDate } from '@/utils/formatting';
import { getPosterUrl } from '@/utils/imageUtils';
```

### 3. **CSS Modules**
Component-specific styles are isolated:

```typescript
// Before
<div style={{ padding: '1rem', background: '#1e1e1e' }}>

// After
import styles from './Component.module.css';
<div className={styles.container}>
```

### 4. **Reusable Hooks**
Common logic extracted into hooks:

```typescript
// Before
useEffect(() => {
  document.title = `CineTrack | ${title}`;
}, [title]);

// After
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
useDocumentTitle(title);
```

## 🔄 Migration Guide

### Step 1: Replace Inline Styles
1. Create a CSS module file: `Component.module.css`
2. Move styles from inline to CSS module
3. Import and use: `import styles from './Component.module.css'`

### Step 2: Extract Constants
1. Find magic strings/numbers in your component
2. Move them to appropriate constant file
3. Import and use

### Step 3: Extract Utilities
1. Identify repeated logic
2. Move to appropriate utility file
3. Import and use

### Step 4: Use Shared Components
1. Check if a shared component exists
2. Use it instead of duplicating code
3. Create new shared components when needed

## 📝 Best Practices

### Component Structure
```typescript
// 1. Imports (external, then internal)
import React from 'react';
import { Button } from '@/components/ui/Button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// 2. Types/Interfaces
interface ComponentProps {
  // ...
}

// 3. Component
export const Component: React.FC<ComponentProps> = ({ ... }) => {
  // Hooks
  useDocumentTitle('Page Title');
  
  // Logic
  // ...
  
  // Render
  return (/* ... */);
};
```

### Styling
- Use CSS modules for component-specific styles
- Use theme constants for colors/spacing
- Avoid inline styles (except for dynamic values)

### Utilities
- Keep utilities pure (no side effects)
- Add JSDoc comments
- Export from index if needed

## 🚀 Next Steps

1. Gradually migrate existing components to use new structure
2. Replace inline styles with CSS modules
3. Extract more utilities as patterns emerge
4. Create more shared components

## 📚 Examples

See these files for reference:
- `src/components/ui/Button.tsx` - Reusable UI component
- `src/components/shared/MediaCard.tsx` - Shared complex component
- `src/utils/formatting.ts` - Utility functions
- `src/constants/theme.ts` - Theme constants
