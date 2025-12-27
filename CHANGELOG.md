# Changelog

All notable changes to Redistal will be documented in this file.

## [Unreleased]

## [0.2.0] - 2025-12-27

### Added - Type-Aware Editors & Streams
- Full CRUD editors for Redis collections:
  - Hash: add/edit/delete fields, search, pagination
  - List: push/pop, edit by index, remove items, pagination
  - Set: add/remove members, search, pagination
  - ZSet: add/remove/increment score, sortable table, pagination
  - Streams: view entries (XRANGE), add entries (XADD), delete entries (XDEL), trim support (XTRIM)
- Backend (Tauri) commands for safe collection editing across all supported types

### Added - CLI Output Enhancements
- Improved CLI output formatting with type-aware pretty printing
- Table views for common collection responses
- Collapsible output for large responses

### Changed
- Test population script now generates stream keys and stream-specific edge cases

### Added - Design System & UX Improvements

#### Theme System
- Modern dark/light theme support with smooth transitions
- Theme toggle button in header with Sun/Moon icons
- Automatic system preference detection
- Theme persistence to localStorage
- Custom color palette: brand (Redis red), neutral, success, warning, error, info
- Monaco editor theme synchronization with app theme

#### UI Component Library
- **Button**: 5 variants (primary, secondary, danger, ghost, outline) with loading states
- **Input**: Enhanced with labels, errors, helper text, and icon support
- **Card**: Multiple variants (default, bordered, elevated)
- **Badge**: 6 semantic variants for status indicators
- **Dialog**: Modal system with backdrop blur and smooth animations
- **IconButton**: Compact icon-only buttons
- **Toast**: Non-intrusive notification system for success/error/warning/info messages
- **ConfirmDialog**: Reusable confirmation dialogs for dangerous operations

#### Error & Feedback UX
- Toast notifications for all major operations:
  - Connection success/failure
  - Key save/delete operations
  - TTL updates
  - CLI command execution
- Confirmation dialogs:
  - Delete key confirmation with key preview
  - Dangerous CLI command warnings (FLUSHDB, FLUSHALL, SHUTDOWN, CONFIG, SAVE, BGSAVE)
- Better error messages throughout the app
- Loading states on all buttons and async operations

#### Visual Improvements
- Redesigned header with logo, connection status badges, and theme toggle
- Improved KeyBrowser with better empty states and selected key highlighting
- Enhanced ValueViewer with color-coded type badges and unsaved changes indicator
- Terminal-styled CLI panel with command counter badge
- Custom scrollbars with theme support
- Smooth animations (fade-in, slide-up, scale-in)
- Better focus states for accessibility
- Improved text selection colors

#### Typography & Colors
- Inter font for UI text
- JetBrains Mono/Fira Code for code and CLI
- WCAG AA compliant color contrast
- Semantic color tokens for consistent theming

### Changed
- Updated all components to use new design system
- Replaced browser `confirm()` with custom ConfirmDialog
- Replaced `console.error` with toast notifications
- Improved spacing and visual hierarchy throughout the app

### Technical Improvements
- ThemeProvider context for centralized theme management
- ToastProvider context for global notification system
- Tailwind CSS v4 with custom design tokens
- Barrel exports for UI components
- Better TypeScript types and props

## Previous Work

### [0.1.0] - Initial Release

#### Added
- Connection management for Redis instances
- Key browsing with pattern search using SCAN (not KEYS)
- Value viewer with Monaco Editor
- Support for all Redis data types (String, List, Set, ZSet, Hash)
- TTL management
- CLI panel with command history
- TLS/SSL support
- Tauri 2.0 + React 19 + Rust architecture
