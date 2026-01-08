# Documentation

## 📚 Quick Links

- **[Quick Reference](QUICK_REFERENCE.md)** - Common patterns and code snippets
- **[Refactoring Guide](REFACTORING_GUIDE.md)** - Step-by-step migration guide

## 🎯 Codebase Improvements

### What Was Done

Your codebase has been improved for better readability, maintainability, and modularity:

#### **New Structure**
- `src/constants/` - Theme, routes, status constants
- `src/utils/` - Formatting, image, DOM, validation utilities
- `src/hooks/` - Reusable React hooks
- `src/components/ui/` - Basic UI components
- `src/components/shared/` - Shared complex components
- `src/styles/components/` - CSS modules for components

#### **Key Features**
- Path aliases (`@/` for `src/`)
- Type-safe utilities
- Modular components
- CSS modules for isolated styles

## 🔍 Code Duplications

### Found Duplications
1. **Image URL Generation** - 4+ files
2. **Year Extraction** - 4+ files
3. **Click Outside Handlers** - 6+ files
4. **Document Title Setting** - 6+ files
5. **Title Extraction** - 4+ files
6. **Date Formatting** - 2+ files
7. **TV Show Detection** - 3+ files
8. **Modal State Management** - Multiple files

### Created Utilities
- `getPosterUrl()`, `getMediaTitle()`, `getMediaYear()`, `isTVShow()` - Media helpers
- `formatDisplayDate()`, `formatRating()`, `formatYear()` - Formatting
- `useClickOutside()`, `useDocumentTitle()`, `useModal()` - Hooks

### Example Fix
See `src/features/media/components/cards/DiscoveryCard.tsx` for a complete refactored example.

### How to Fix
1. **Image URLs**: Use `getPosterUrl(media.poster_path, title)`
2. **Year**: Use `getMediaYear(media)`
3. **Title**: Use `getMediaTitle(media)`
4. **TV Detection**: Use `isTVShow(media)`
5. **Click Outside**: Use `useClickOutside(ref, handler)`
6. **Document Title**: Use `useDocumentTitle('Title')`
7. **Modal State**: Use `useModal()`

## 📋 Next Steps

1. Review `DiscoveryCard.tsx` for refactoring pattern
2. Apply same pattern to other card components
3. Replace click outside handlers in pages/components
4. Replace document title setters with hook

## 🚀 Usage Examples

### Constants
```typescript
import { theme, ROUTES } from '@/constants';
```

### Utilities
```typescript
import { getPosterUrl, getMediaTitle, formatDisplayDate } from '@/utils';
```

### Hooks
```typescript
import { useDocumentTitle, useClickOutside, useModal } from '@/hooks';
```

### CSS Modules
```typescript
import styles from './Component.module.css';
```
