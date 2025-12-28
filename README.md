# Redistal

A fast, native Redis GUI for macOS. Built with Tauri, React, and Rust.

<p align="center">
  <img src="src-tauri/icons/128x128.png" width="96" alt="Redistal" />
</p>

## Download

**[Download Redistal v0.3.0 for macOS (Apple Silicon)](https://github.com/amiralibg/Redistal/releases/latest)**

Or build from source (see below).

## What it does

- Browse and edit Redis keys with a clean interface
- Full support for all data types: strings, lists, sets, sorted sets, hashes, and streams
- SSH tunnel connections for remote servers
- Built-in CLI with command history
- Server monitoring and stats
- Dark and light themes
- Secure credential storage via system keychain

## Screenshots

*Coming soon*

## Features

### Connection Management
- Local and remote Redis connections
- SSH tunnel support (password or private key auth)
- TLS/SSL encryption
- Multiple database selection
- Save and manage connections
- Passwords stored in system keychain

### Key Browser
- Pattern-based search (`user:*`, `session:*`)
- Filter by key type
- Keyboard shortcuts for quick navigation

### Value Editing
Type-aware editors for each Redis data type:
- **String**: Monaco editor with JSON detection
- **Hash**: Field table with add/edit/delete
- **List**: Push, pop, edit by index
- **Set**: Add/remove members
- **ZSet**: Score management, sortable
- **Stream**: View entries, add/delete, trim

### CLI
- Execute any Redis command
- History navigation (↑/↓)
- Pretty-printed output
- Dangerous command warnings

### Monitoring
- Server info and stats
- Connected clients
- Slow query log
- Command statistics

## Getting Started

### Requirements
- Node.js 18+
- Rust (latest stable)
- A Redis server to connect to

### Development

```bash
git clone https://github.com/amiralibg/Redistal.git
cd redistal
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

Output goes to `src-tauri/target/release/bundle/`.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Focus search |
| `⌘R` | Refresh keys |
| `⌘N` | New connection |
| `⌘P` | Command palette |
| `⌘\`` | Toggle CLI panel |
| `Esc` | Close dialogs |

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Zustand, Monaco Editor
- **Backend**: Rust, Tauri 2.0, redis-rs, ssh2

## Contributing

PRs welcome. Please open an issue first for major changes.

## License

MIT
