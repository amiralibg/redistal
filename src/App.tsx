import { useState, useRef } from "react";
import {
  Database,
  Plus,
  List,
  Shield,
  ShieldAlert,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Terminal,
} from "lucide-react";
import { ConnectionDialog } from "./components/ConnectionDialog";
import { ConnectionList } from "./components/ConnectionList";
import { KeyBrowser } from "./components/KeyBrowser";
import { ValueViewer } from "./components/ValueViewer";
import { CliPanel } from "./components/CliPanel";
import { CommandPalette, CommandAction } from "./components/CommandPalette";
import { Settings } from "./components/Settings";
import { useRedisStore } from "./store/useRedisStore";
import { useTheme } from "./lib/theme-context";
import { useLoadConnections } from "./hooks/useLoadConnections";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { Button, IconButton, Badge } from "./components/ui";
import type { StoredConnection } from "./types/redis";
import { getCurrentWindow } from "@tauri-apps/api/window";

function App() {
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showConnectionList, setShowConnectionList] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCliPanel, setShowCliPanel] = useState(true);
  const [editingConnection, setEditingConnection] = useState<
    StoredConnection | undefined
  >(undefined);
  const {
    activeConnectionId,
    connections,
    savedConnections,
    safeMode,
    setSafeMode,
  } = useRedisStore();
  const { theme, toggleTheme } = useTheme();

  // Refs for triggering actions from keyboard shortcuts
  const refreshKeysRef = useRef<(() => void) | null>(null);
  const focusSearchRef = useRef<(() => void) | null>(null);

  useLoadConnections();

  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      meta: true,
      description: "Focus search",
      handler: () => {
        if (focusSearchRef.current) {
          focusSearchRef.current();
        }
      },
    },
    {
      key: "r",
      ctrl: true,
      meta: true,
      description: "Refresh keys",
      handler: () => {
        if (activeConnectionId && refreshKeysRef.current) {
          refreshKeysRef.current();
        }
      },
    },
    {
      key: "n",
      ctrl: true,
      meta: true,
      description: "New connection",
      handler: () => {
        setShowConnectionDialog(true);
      },
    },
    {
      key: "p",
      ctrl: true,
      meta: true,
      description: "Open command palette",
      handler: () => {
        setShowCommandPalette(true);
      },
    },
    {
      key: "`",
      ctrl: true,
      meta: true,
      description: "Toggle CLI panel",
      handler: () => {
        setShowCliPanel((prev) => !prev);
      },
    },
    {
      key: "Escape",
      description: "Close dialogs",
      handler: () => {
        if (showCommandPalette) {
          setShowCommandPalette(false);
        } else if (showConnectionDialog) {
          setShowConnectionDialog(false);
          setEditingConnection(undefined);
        } else if (showConnectionList) {
          setShowConnectionList(false);
        }
      },
    },
  ]);

  // Command palette actions
  const commandActions: CommandAction[] = [
    {
      id: "new-connection",
      label: "New Connection",
      description: "Create a new Redis connection",
      icon: <Plus className="w-4 h-4" />,
      shortcut: "⌘N",
      keywords: ["connect", "add", "create"],
      action: () => setShowConnectionDialog(true),
    },
    {
      id: "show-connections",
      label: "Show Connections",
      description: "View all saved connections",
      icon: <List className="w-4 h-4" />,
      keywords: ["list", "saved", "bookmarks"],
      action: () => setShowConnectionList(true),
    },
    {
      id: "refresh-keys",
      label: "Refresh Keys",
      description: "Reload keys from Redis",
      icon: <RefreshCw className="w-4 h-4" />,
      shortcut: "⌘R",
      keywords: ["reload", "update"],
      action: () => {
        if (refreshKeysRef.current) {
          refreshKeysRef.current();
        }
      },
    },
    {
      id: "focus-search",
      label: "Focus Search",
      description: "Focus the key search input",
      icon: <Search className="w-4 h-4" />,
      shortcut: "⌘K",
      keywords: ["find", "filter"],
      action: () => {
        if (focusSearchRef.current) {
          focusSearchRef.current();
        }
      },
    },
    {
      id: "toggle-theme",
      label: "Toggle Theme",
      description: `Switch to ${theme === "light" ? "dark" : "light"} mode`,
      icon:
        theme === "light" ? (
          <Moon className="w-4 h-4" />
        ) : (
          <Sun className="w-4 h-4" />
        ),
      keywords: ["dark", "light", "appearance"],
      action: () => toggleTheme(),
    },
    {
      id: "toggle-safe-mode",
      label: safeMode ? "Disable Safe Mode" : "Enable Safe Mode",
      description: safeMode
        ? "Allow write operations"
        : "Prevent accidental writes and deletes",
      icon: safeMode ? (
        <ShieldAlert className="w-4 h-4" />
      ) : (
        <Shield className="w-4 h-4" />
      ),
      keywords: ["readonly", "write", "protect"],
      action: () => setSafeMode(!safeMode),
    },
    {
      id: "toggle-cli",
      label: showCliPanel ? "Hide CLI Panel" : "Show CLI Panel",
      description: showCliPanel
        ? "Hide the CLI command panel"
        : "Show the CLI command panel",
      icon: <Terminal className="w-4 h-4" />,
      shortcut: "⌘`",
      keywords: ["terminal", "command", "console", "cli"],
      action: () => setShowCliPanel(!showCliPanel),
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      {/* Custom titlebar with drag region */}
      <div
        className="h-8 bg-white dark:bg-neutral-900 shrink-0 select-none"
        onMouseDown={async (e) => {
          if (e.buttons === 1) {
            if (e.detail === 2) {
              // Double click to maximize/restore
              await getCurrentWindow().toggleMaximize();
            } else {
              // Single click to start dragging
              await getCurrentWindow().startDragging();
            }
          }
        }}
      >
        {/* Leave space for macOS traffic lights (approximately 70-80px) */}
        <div className="h-full flex items-center" />
      </div>

      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 pb-4 pt-1 shadow-soft">
        <div className="flex items-center justify-between">
          {/* Left Section - Logo and Connection Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-600 rounded-lg shadow-sm">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Redistal
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Redis GUI Client
                </p>
              </div>
            </div>

            {activeConnection && (
              <div className="flex items-center gap-3 ml-6 pl-6 border-l border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success-light dark:bg-success-dark rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                    {activeConnection.name}
                  </span>
                </div>
                <Badge variant="default" size="sm">
                  {activeConnection.host}:{activeConnection.port}
                </Badge>
                <Badge variant="info" size="sm">
                  DB {activeConnection.database}
                </Badge>
              </div>
            )}
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-3">
            {activeConnectionId && (
              <>
                <IconButton
                  onClick={() => setSafeMode(!safeMode)}
                  variant={safeMode ? "ghost" : "ghost"}
                  size="md"
                  title={
                    safeMode
                      ? "Safe mode enabled (read-only)"
                      : "Safe mode disabled"
                  }
                  className={
                    safeMode ? "text-success-light dark:text-success-dark" : ""
                  }
                >
                  {safeMode ? (
                    <Shield className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </IconButton>

                <IconButton
                  onClick={() => setShowCliPanel(!showCliPanel)}
                  variant="ghost"
                  size="md"
                  title={
                    showCliPanel ? "Hide CLI panel (⌘`)" : "Show CLI panel (⌘`)"
                  }
                >
                  <Terminal className="w-5 h-5" />
                </IconButton>
              </>
            )}

            <IconButton
              onClick={() => setShowSettings(true)}
              variant="ghost"
              size="md"
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </IconButton>

            {savedConnections.length > 0 && (
              <Button
                onClick={() => setShowConnectionList(true)}
                variant="secondary"
                size="md"
              >
                <List className="w-4 h-4" />
                Connections ({savedConnections.length})
              </Button>
            )}

            <Button
              onClick={() => setShowConnectionDialog(true)}
              variant="primary"
              size="md"
            >
              <Plus className="w-4 h-4" />
              New Connection
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Key Browser */}
        <div className="w-80 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <KeyBrowser
            onRefreshKeysRef={refreshKeysRef}
            onFocusSearchRef={focusSearchRef}
          />
        </div>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col">
          {/* Value Viewer */}
          <div className="flex-1 overflow-hidden">
            <ValueViewer />
          </div>

          {/* CLI Panel */}
          {showCliPanel && (
            <div className="h-64 border-t border-neutral-200 dark:border-neutral-800">
              <CliPanel />
            </div>
          )}
        </div>
      </div>

      {/* Connection Dialog */}
      <ConnectionDialog
        isOpen={showConnectionDialog}
        onClose={() => {
          setShowConnectionDialog(false);
          setEditingConnection(undefined);
        }}
        editConnection={editingConnection}
      />

      {/* Connection List */}
      <ConnectionList
        isOpen={showConnectionList}
        onClose={() => setShowConnectionList(false)}
        onEditConnection={(connection) => {
          setEditingConnection(connection);
          setShowConnectionList(false);
          setShowConnectionDialog(true);
        }}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        actions={commandActions}
      />

      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default App;
