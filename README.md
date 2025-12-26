# Redistal

A modern, open-source Redis GUI built with Tauri, React, and Rust.

![Redistal Banner](https://img.shields.io/badge/Redis-GUI-red?style=for-the-badge&logo=redis)
![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?style=for-the-badge&logo=tauri)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Rust](https://img.shields.io/badge/Rust-latest-orange?style=for-the-badge&logo=rust)

## Features

### ✅ Current Features

- **Connection Management**
  - Connect to local and remote Redis instances
  - Support for Redis with authentication (username/password)
  - TLS/SSL support
  - Multiple database selection (0-15)
  - Secure credential storage using system keyring

- **Key Browser**
  - Search keys with pattern matching (e.g., `user:*`)
  - Real-time key listing
  - Key type indicators
  - Quick refresh capability

- **Value Viewer**
  - Monaco Editor integration for syntax highlighting
  - Support for all Redis data types:
    - String
    - List
    - Set
    - Sorted Set (ZSet)
    - Hash
  - JSON auto-detection and formatting
  - Inline editing and saving
  - Key deletion

- **TTL Management**
  - View key expiration times
  - Set/update TTL values
  - Persist keys (remove expiration)

- **CLI Panel**
  - Execute raw Redis commands
  - Command history with ↑/↓ navigation
  - Syntax highlighting for commands and results
  - Error handling with clear feedback

### 🚧 Planned Features

- **Streams Viewer**
  - View Redis Streams
  - Consumer group management
  - Message browsing

- **Pub/Sub Monitor**
  - Subscribe to channels
  - View real-time messages
  - Pattern subscription support

- **Advanced Features**
  - Bulk operations
  - Data import/export
  - Key renaming
  - Connection bookmarks
  - Dark/Light theme toggle
  - Performance monitoring

## Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS - Utility-first styling
- **Zustand** - State management
- **Monaco Editor** - Code editor for JSON/values
- **Lucide React** - Icon library
- **Vite 6** - Build tool

### Backend (Tauri)
- **Rust** - Native backend
- **redis-rs** - Official Redis client
- **tokio** - Async runtime
- **serde** - Serialization
- **keyring** - Secure credential storage

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **Rust** (latest stable)
- **Redis** server (for testing)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/redistal.git
cd redistal
```

2. Install dependencies:
```bash
npm install
```

3. Run in development mode:
```bash
npm run tauri dev
```

### Building

To create a production build:

```bash
npm run tauri build
```

The built application will be in `src-tauri/target/release`.

## Usage

### Connecting to Redis

1. Click the "New Connection" button in the header
2. Fill in your Redis connection details:
   - **Connection Name**: A friendly name for your connection
   - **Host**: Redis server hostname (e.g., `localhost`)
   - **Port**: Redis port (default: `6379`)
   - **Username**: (Optional) Redis username for ACL
   - **Password**: (Optional) Redis password
   - **Database**: Database number (0-15)
   - **Use TLS**: Enable for secure connections
3. Click "Connect"

### Browsing Keys

- Use the search bar to filter keys with patterns (e.g., `user:*`, `session:*`)
- Click on any key to view its value
- The key type and size are displayed in the value viewer

### Editing Values

- Click on a key to load its value in the Monaco Editor
- Edit the value (JSON formatting is automatic)
- Click "Save" to persist changes
- Click "Delete" to remove the key

### Managing TTL

- Click on the TTL value in the value viewer
- Enter a new TTL in seconds (-1 for no expiration)
- Click "Save" to apply

### Using the CLI

- Type Redis commands in the CLI panel at the bottom
- Press Enter to execute
- Use ↑/↓ arrow keys to navigate command history
- Examples:
  - `GET mykey`
  - `SET mykey "hello"`
  - `KEYS user:*`
  - `HGETALL myhash`

## Project Structure

```
redistal/
├── src/                      # React frontend
│   ├── components/          # UI components
│   │   ├── ConnectionDialog.tsx
│   │   ├── KeyBrowser.tsx
│   │   ├── ValueViewer.tsx
│   │   └── CliPanel.tsx
│   ├── store/               # Zustand state management
│   │   └── useRedisStore.ts
│   ├── types/               # TypeScript types
│   │   └── redis.ts
│   ├── lib/                 # Utilities
│   │   └── tauri-api.ts
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── commands.rs      # Tauri commands
│   │   ├── redis_client.rs  # Redis connection manager
│   │   └── lib.rs           # Main library
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
├── package.json
├── vite.config.ts
└── README.md
```

## Development

### Running Tests

```bash
# Run Rust tests
cd src-tauri
cargo test

# Run frontend tests (if configured)
npm test
```

### Code Style

- Frontend: ESLint + Prettier
- Backend: `rustfmt`

```bash
# Format Rust code
cd src-tauri
cargo fmt

# Format frontend code
npm run format
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - The framework that makes this possible
- [redis-rs](https://github.com/redis-rs/redis-rs) - Excellent Redis client for Rust
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Powerful code editor
- [Lucide](https://lucide.dev/) - Beautiful icons

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/yourusername/redistal/issues).

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

---

Made with ❤️ by the open-source community
