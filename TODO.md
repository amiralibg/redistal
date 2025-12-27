# Redistal TODO

This file tracks planned features and tech-debt items for the Redis GUI.

## Recently Completed (Latest Session)

- [x] **Type-Aware Collection Editors** - Full CRUD operations for all Redis data types
  - [x] Hash editor with table UI, add/edit/delete fields, search, pagination
  - [x] List editor with push/pop operations, index editing, pagination, remove items
  - [x] Set editor with add/remove members, search, pagination
  - [x] ZSet editor with sortable table (by member/score), add/edit/delete, pagination
  - [x] **Stream editor** with entry viewing, add multi-field entries, delete entries, search, configurable entry count
  - [x] All editors respect safe mode and show loading states
  - [x] Backend commands: HSET, HDEL, LPUSH, RPUSH, LPOP, RPOP, LSET, LREM, SADD, SREM, ZADD, ZREM, ZINCRBY, XADD, XDEL, XRANGE, XTRIM
- [x] **CLI Output Enhancements** - Beautiful, readable command output
  - [x] RESP pretty printing with type detection
  - [x] Table view for hashes (field/value columns)
  - [x] Table view for lists (index/value columns)
  - [x] Table view for sorted sets (member/score columns)
  - [x] Syntax highlighting for Redis commands
  - [x] Collapsible large outputs (500+ chars) with expand/collapse buttons
  - [x] Smart formatting for JSON arrays and objects

## Previously Completed

- [x] **Performance Overhaul** - Major performance improvements for handling large datasets
  - [x] Removed 10k key limit - now fetches ALL matching keys using SCAN
  - [x] Virtual scrolling with react-window for rendering 100k+ keys smoothly
  - [x] Debounced search (500ms) for instant client-side filtering
  - [x] In-memory caching system for keys, values, and metadata (10-30s TTL)
  - [x] Pagination APIs for large collections (lists, sets, hashes, zsets)
  - [x] Optimized SCAN batch size from 500 to 1000
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

- [x] Removed 10k key limit (now fetches all keys via SCAN)
- [x] Cursor-based paging for key browsing (`SCAN` cursor in UI) with Load More button
- [x] List virtualization for rendering thousands of keys (react-window)
- [x] Debounced search input (500ms) with client-side filtering
- [x] In-memory caching for API calls (10-30s TTL with auto-invalidation)
- [ ] Replace global refresh with incremental loading + cancel support
- [x] Avoid loading huge values by default:
  - [x] Size-aware loading (show size before loading large values)
  - [x] Configurable max value size threshold (1MB)
  - [x] Fetch ranges for lists/sets/zsets (paginated viewing) - Backend APIs ready
  - [ ] Stream large string values
- [ ] Background key count refresh (non-blocking)
- [x] Debounced search input (500ms delay)
- [x] Cache frequently accessed keys/values (SimpleCache with TTL)

## Core Redis UX

- [ ] **Key Management**
  - [x] Create key flow (choose type: string/hash/list/set/zset/stream)
  - [x] Rename key support
  - [x] Duplicate/copy key
  - [ ] Key metadata panel (memory usage, encoding, refcount)
  - [ ] Multi-select keys for bulk operations
  - [ ] Filter keys by type

- [x] **Type-Aware Editors**
  - [x] String editor:
    - [x] Text mode with syntax highlighting
    - [x] JSON mode with validation and formatting
    - [ ] Hex viewer for binary data
    - [ ] Base64 encode/decode
  - [x] Hash editor with full CRUD (add/edit/delete fields, search, pagination)
  - [x] List editor with full CRUD (push/pop, index edit, remove, pagination)
  - [x] Set editor with full CRUD (add/remove members, search, pagination)
  - [x] ZSet editor with full CRUD (add/edit/delete, sortable table, pagination)
  - [x] Stream editor with full CRUD (add multi-field entries, delete, XRANGE viewing, configurable count)
  - [ ] Future enhancements:
    - [ ] Stream consumer groups management (XGROUP, XREADGROUP)
    - [ ] Hex viewer for binary string data
    - [ ] Base64 encode/decode for strings

- [x] **CLI Enhancements**
  - [x] Better output formatting:
    - [x] RESP-like pretty printing
    - [x] Table view for hashes and lists
    - [x] Syntax highlighting for commands
    - [x] Collapsible large outputs
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
