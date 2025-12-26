# Redistal TODO

This file tracks planned features and tech-debt items for the Redis GUI.

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

## Next (High Priority)

- [ ] **Connection Management**
  - [ ] Persist connections (name/host/port/db/use_tls) to disk
  - [ ] Store passwords securely in OS keychain (Rust `keyring`)
  - [ ] Connection bookmarks/favorites
  - [ ] Recent connections list
  - [ ] Test connection before saving
  - [ ] Connection groups/folders for organization
  - [ ] Quick connection switcher (dropdown or command palette)

- [ ] **Safety Features**
  - [ ] Read-only / safe mode toggle (prevent accidental writes/deletes)
  - [ ] Confirmation dialog for key deletion
  - [ ] Confirmation for bulk operations
  - [ ] Dangerous command warnings (FLUSHDB, FLUSHALL, etc.)

## Data & Performance

- [ ] Cursor-based paging for key browsing (`SCAN` cursor in UI) + list virtualization
- [ ] Replace global refresh with incremental loading + cancel support
- [ ] Avoid loading huge values by default:
  - [ ] Size-aware loading (show size before loading large values)
  - [ ] Fetch ranges for lists/sets/zsets (paginated viewing)
  - [ ] Stream large string values
  - [ ] Configurable max value size threshold
- [ ] Background key count refresh (non-blocking)
- [ ] Debounced search input
- [ ] Cache frequently accessed keys/values

## Core Redis UX

- [ ] **Key Management**
  - [ ] Create key flow (choose type: string/hash/list/set/zset/stream)
  - [ ] Rename key support
  - [ ] Duplicate/copy key
  - [ ] Key metadata panel (memory usage, encoding, refcount)
  - [ ] Multi-select keys for bulk operations
  - [ ] Filter keys by type

- [ ] **Type-Aware Editors**
  - [ ] String editor:
    - [ ] Text mode with syntax highlighting
    - [ ] JSON mode with validation and formatting
    - [ ] Hex viewer for binary data
    - [ ] Base64 encode/decode
  - [ ] Hash table editor:
    - [ ] Table view with field/value columns
    - [ ] Add/edit/delete individual fields
    - [ ] Search/filter fields
    - [ ] Bulk import/export fields
  - [ ] List viewer/editor:
    - [ ] Index-based navigation
    - [ ] Push/pop operations (LPUSH, RPUSH, LPOP, RPOP)
    - [ ] Insert at index
    - [ ] Remove by value
    - [ ] Trim list
  - [ ] Set viewer/editor:
    - [ ] Add/remove members
    - [ ] Set operations UI (union, intersection, difference)
    - [ ] Check membership
    - [ ] Random member picker
  - [ ] Zset viewer/editor:
    - [ ] Sortable table (by score or member)
    - [ ] Add/update member with score
    - [ ] Remove members
    - [ ] Range queries (by score or rank)
    - [ ] Increment score
  - [ ] Stream viewer:
    - [ ] Message list with pagination
    - [ ] Consumer group management
    - [ ] Add messages to stream
    - [ ] Acknowledge messages

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

- [ ] Keyboard shortcuts:
  - [ ] Global search focus (Cmd/Ctrl + K)
  - [ ] Next/prev key navigation (↑/↓)
  - [ ] Run CLI command (Enter in CLI)
  - [ ] Toggle CLI panel (Cmd/Ctrl + `)
  - [ ] New connection (Cmd/Ctrl + N)
  - [ ] Refresh keys (Cmd/Ctrl + R)
  - [ ] Quick command palette (Cmd/Ctrl + P)
- [ ] Command palette for quick actions
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
