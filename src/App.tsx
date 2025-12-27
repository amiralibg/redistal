import { useState } from "react";
import {
  Database,
  Plus,
  Sun,
  Moon,
  List,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { ConnectionDialog } from "./components/ConnectionDialog";
import { ConnectionList } from "./components/ConnectionList";
import { KeyBrowser } from "./components/KeyBrowser";
import { ValueViewer } from "./components/ValueViewer";
import { CliPanel } from "./components/CliPanel";
import { useRedisStore } from "./store/useRedisStore";
import { useTheme } from "./lib/theme-context";
import { useLoadConnections } from "./hooks/useLoadConnections";
import { Button, IconButton, Badge } from "./components/ui";
import type { StoredConnection } from "./types/redis";

function App() {
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showConnectionList, setShowConnectionList] = useState(false);
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

  useLoadConnections();

  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  return (
    <div className="h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 shadow-soft">
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
            )}

            <IconButton
              onClick={toggleTheme}
              variant="ghost"
              size="md"
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
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
          <KeyBrowser />
        </div>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col">
          {/* Value Viewer */}
          <div className="flex-1 overflow-hidden">
            <ValueViewer />
          </div>

          {/* CLI Panel */}
          <div className="h-64 border-t border-neutral-200 dark:border-neutral-800">
            <CliPanel />
          </div>
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
    </div>
  );
}

export default App;
