# Redistal TODO

This file tracks planned features and tech-debt items for the Redis GUI.

## Recently Completed (Latest Session)

- [x] **Test Connection Before Saving** - Validate connections with PING before saving to prevent broken configs
- [x] **Size-Aware Value Loading** - Check memory usage (1MB threshold) and warn before loading large values
- [x] **Cursor-Based Key Pagination** - Non-blocking SCAN with "Load More" button (100 keys/batch)
- [x] **Global Keyboard Shortcuts** - Cmd+K (search), Cmd+R (refresh), Cmd+N (new), Cmd+P (palette), Esc (close)
- [x] **Command Palette** - Searchable quick action menu with fuzzy matching and keyboard navigation

## Done

- [x] Replace `KEYS` with `SCAN` in key listing (prevents blocking on large datasets)
- [x] **Retheme & Design Overhaul**
  - [x] Modern UI redesign with improved spacing, typography, and visual hierarchy
  - [x] Dark/Light theme toggle with system preference detection
  - [x] Theme persistence (save user preference)
  - [x] Improved color palette (primary, secondary, accent colors)
  - [x] Better iconography and visual feedback
  - [x] Responsive layout improvements
  - [x] Custom scrollbars and polish
- [x] **Error & Feedback UX**
  - [x] Toast notification system for errors/success messages
  - [x] Loading states for all async operations (buttons have loading prop)
  - [x] Better error messages with actionable suggestions
  - [x] Confirmation dialogs for destructive actions (delete key, dangerous commands)
- [x] **Connection Management**
  - [x] Persist connections (name/host/port/db/use_tls) to disk
  - [x] Store passwords securely in OS keychain (Rust `keyring`)
  - [x] Connection bookmarks/favorites (saved connections list)
  - [x] Quick connection switcher (connections dialog)
  - [x] Edit saved connections
  - [x] Delete saved connections
  - [x] Load saved connections on startup
  - [x] Test connection before saving
  - [ ] Connection groups/folders for organization
- [x] **Safety Features**
  - [x] Read-only / safe mode toggle (prevent accidental writes/deletes)
  - [x] Confirmation dialog for key deletion
  - [ ] Confirmation for bulk operations
  - [x] Dangerous command warnings (FLUSHDB, FLUSHALL, etc.)

## Data & Performance

- [x] Cursor-based paging for key browsing (`SCAN` cursor in UI) with Load More button
- [ ] List virtualization for rendering thousands of keys
- [ ] Replace global refresh with incremental loading + cancel support
- [x] Avoid loading huge values by default:
  - [x] Size-aware loading (show size before loading large values)
  - [x] Configurable max value size threshold (1MB)
  - [ ] Fetch ranges for lists/sets/zsets (paginated viewing)
  - [ ] Stream large string values
- [ ] Background key count refresh (non-blocking)
- [ ] Debounced search input
- [ ] Cache frequently accessed keys/values

## Core Redis UX

- [ ] **Key Management**
  - [x] Create key flow (choose type: string/hash/list/set/zset/stream)
  - [x] Rename key support
  - [x] Duplicate/copy key
  - [ ] Key metadata panel (memory usage, encoding, refcount)
  - [ ] Multi-select keys for bulk operations
  - [ ] Filter keys by type

- [ ] **Type-Aware Editors**
  - [x] String editor:
    - [x] Text mode with syntax highlighting
    - [x] JSON mode with validation and formatting
    - [ ] Hex viewer for binary data
    - [ ] Base64 encode/decode
  - [x] Hash viewer (JSON display, read-only)
  - [x] List viewer (JSON display, read-only)
  - [x] Set viewer (JSON display, read-only)
  - [x] Zset viewer (JSON display with scores, read-only)
  - [x] Stream viewer (raw format display, read-only)
  - [ ] Future enhancements:
    - [ ] Hash table editor with add/edit/delete fields UI
    - [ ] List editor with push/pop operations UI
    - [ ] Set editor with add/remove members UI
    - [ ] Zset editor with sortable table UI
    - [ ] Stream viewer with pagination and message management

- [ ] **CLI Enhancements**
  - [ ] Better output formatting:
    - [ ] RESP-like pretty printing
    - [ ] Table view for hashes and lists
    - [ ] Syntax highlighting for commands
    - [ ] Collapsible large outputs
  - [ ] Command auto-completion
  - [ ] Command help/documentation inline
  - [ ] Saved command snippets
  - [ ] Export CLI history

## Monitoring & Analytics

- [ ] Real-time server stats dashboard (INFO command visualization)
- [ ] Memory usage breakdown by key pattern
- [ ] Slow log viewer
- [ ] Client list viewer
- [ ] Pub/Sub monitor (subscribe to channels, view messages in real-time)
- [ ] Command statistics (COMMANDSTATS)
- [ ] Key access patterns and hot keys

## Connectivity (Enterprise-Friendly)

- [ ] SSH tunnel support:
  - [ ] Built-in SSH client with key/password auth
  - [ ] Or guided setup for local forwarded ports
- [ ] Sentinel awareness:
  - [ ] Discover master/replicas
  - [ ] Read-only mode for replicas
  - [ ] Failover monitoring
- [ ] Cluster awareness:
  - [ ] Cluster topology view
  - [ ] Slot distribution visualization
  - [ ] Per-node connection
  - [ ] CLUSTER commands support
- [ ] Redis Stack modules support (RedisJSON, RedisSearch, RedisGraph, etc.)
- [ ] Unix socket connections

## Utilities

- [ ] **Import/Export**
  - [ ] Export keys to JSON/CSV
  - [ ] Import keys from JSON/CSV
  - [ ] Export current view/filtered keys
  - [ ] RDB file analyzer (read-only)
  - [ ] Copy key to clipboard (JSON format)
  - [ ] Copy value to clipboard

- [ ] **Bulk Operations**
  - [ ] Bulk delete with pattern matching + preview
  - [ ] Bulk set TTL with pattern matching
  - [ ] Bulk rename (prefix/suffix)
  - [ ] Bulk export
  - [ ] Progress indicators for bulk ops
  - [ ] Cancel long-running operations

- [ ] **Command History**
  - [ ] Persist CLI history across sessions
  - [ ] Search command history
  - [ ] Favorite/starred commands
  - [ ] History per connection

- [ ] **Database Management**
  - [ ] Database switcher (currently selected but could be better UI)
  - [ ] Database info (key count, size)
  - [ ] FLUSHDB/FLUSHALL with strong confirmations

## Developer Experience

- [x] Keyboard shortcuts:
  - [x] Global search focus (Cmd/Ctrl + K)
  - [x] New connection (Cmd/Ctrl + N)
  - [x] Refresh keys (Cmd/Ctrl + R)
  - [x] Quick command palette (Cmd/Ctrl + P)
  - [x] Close dialogs (Escape)
  - [ ] Next/prev key navigation (↑/↓)
  - [ ] Run CLI command (Enter in CLI)
  - [ ] Toggle CLI panel (Cmd/Ctrl + `)
- [x] Command palette for quick actions
  - [x] Searchable command menu with fuzzy matching
  - [x] Keyboard navigation (↑↓ arrows, Enter)
  - [x] Built-in actions: New Connection, Show Connections, Refresh, Focus Search, Toggle Theme, Toggle Safe Mode
- [ ] Customizable layout (resizable panels)
- [ ] Split view (compare two keys side-by-side)
- [ ] Workspaces (save UI state per connection)

## Documentation & Help

- [ ] In-app help/documentation
- [ ] Redis command reference (searchable)
- [ ] Tutorial/onboarding for first-time users
- [ ] Keyboard shortcuts cheatsheet
- [ ] Sample data generator for testing

## Advanced Features

- [ ] Transaction builder (MULTI/EXEC with preview)
- [ ] Lua script editor and executor
- [ ] Pipeline command batching
- [ ] Watch key changes in real-time
- [ ] Diff tool (compare values across databases or servers)
- [ ] Role-based access simulation (test ACL rules)
- [ ] Connection pooling visualization
- [ ] Query profiling

## Platform & Distribution

- [ ] Auto-update mechanism
- [ ] Crash reporting (optional, privacy-focused)
- [ ] Telemetry (opt-in, anonymous usage stats)
- [ ] Multi-language support (i18n)
- [ ] Windows/macOS/Linux optimizations
- [ ] Portable mode (store config in app directory)
- [ ] Custom protocol handler (redistal:// URLs)

## Nice to Have

- [ ] Plugin system for custom commands/views
- [ ] Database comparison tool (compare two Redis instances)
- [ ] Migration tool (move keys between servers)
- [ ] Backup scheduler with cron-like syntax
- [ ] GraphQL-like query builder for complex operations
- [ ] AI-powered query suggestions (e.g., "find all user sessions older than 1 day")
