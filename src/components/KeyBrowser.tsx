import { useEffect, useState, useRef, MutableRefObject } from "react";
import { Search, RefreshCw, Key, Database, Plus } from "lucide-react";
import { useRedisStore } from "../store/useRedisStore";
import { redisApi } from "../lib/tauri-api";
import { Input, IconButton, Badge, Button } from "./ui";
import { CreateKeyDialog } from "./CreateKeyDialog";
import clsx from "clsx";

interface KeyBrowserProps {
  onRefreshKeysRef?: MutableRefObject<(() => void) | null>;
  onFocusSearchRef?: MutableRefObject<(() => void) | null>;
}

export function KeyBrowser({
  onRefreshKeysRef,
  onFocusSearchRef,
}: KeyBrowserProps = {}) {
  const {
    activeConnectionId,
    keys,
    selectedKey,
    searchPattern,
    setKeys,
    setSelectedKey,
    setSelectedKeyInfo,
    setSearchPattern,
  } = useRedisStore();

  const [loading, setLoading] = useState(false);
  const [localPattern, setLocalPattern] = useState(searchPattern);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadKeys = async () => {
    if (!activeConnectionId) return;

    setLoading(true);
    try {
      const loadedKeys = await redisApi.getKeys(
        activeConnectionId,
        searchPattern,
      );
      setKeys(loadedKeys);
    } catch (error) {
      console.error("Failed to load keys:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeConnectionId) {
      loadKeys();
    }
  }, [activeConnectionId, searchPattern]);

  // Expose methods via refs for keyboard shortcuts
  useEffect(() => {
    if (onRefreshKeysRef) {
      onRefreshKeysRef.current = loadKeys;
    }
    if (onFocusSearchRef) {
      onFocusSearchRef.current = () => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      };
    }
  }, [onRefreshKeysRef, onFocusSearchRef]);

  const handleKeyClick = async (key: string) => {
    if (!activeConnectionId) return;

    setSelectedKey(key);
    try {
      const keyInfo = await redisApi.getKeyInfo(activeConnectionId, key);
      setSelectedKeyInfo(keyInfo);
    } catch (error) {
      console.error("Failed to load key info:", error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchPattern(localPattern);
  };

  if (!activeConnectionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Database className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mb-4" />
        <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          No Connection
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
          Connect to a Redis server to browse keys
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
            Keys
          </h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreateDialog(true)}
              variant="primary"
              size="sm"
              disabled={!activeConnectionId}
            >
              <Plus className="w-4 h-4" />
              New
            </Button>
            <IconButton
              type="button"
              onClick={loadKeys}
              disabled={loading}
              variant="ghost"
              size="sm"
              title="Refresh keys"
            >
              <RefreshCw
                className={clsx("w-4 h-4", loading && "animate-spin")}
              />
            </IconButton>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch}>
          <Input
            ref={searchInputRef}
            type="text"
            value={localPattern}
            onChange={(e) => setLocalPattern(e.target.value)}
            placeholder="Search pattern (e.g., user:*)"
            leftIcon={<Search className="w-4 h-4" />}
          />
        </form>

        {/* Key Count */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            {keys.length} {keys.length === 1 ? "key" : "keys"} found
          </span>
          {keys.length >= 10000 && (
            <Badge variant="warning" size="sm">
              Limited to 10k
            </Badge>
          )}
        </div>
      </div>

      {/* Key List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mb-3" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Loading keys...
            </p>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6">
            <Key className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mb-3" />
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              No Keys Found
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs">
              Try adjusting your search pattern or create a new key
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {keys.map((key) => (
              <button
                key={key}
                onClick={() => handleKeyClick(key)}
                className={clsx(
                  "w-full text-left px-4 py-3 transition-all duration-200",
                  "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                  "focus:outline-none focus:bg-neutral-50 dark:focus:bg-neutral-800/50",
                  selectedKey === key
                    ? "bg-brand-50 dark:bg-brand-900/20 border-l-3 border-l-brand-600 pl-[13px]"
                    : "",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Key
                    className={clsx(
                      "w-4 h-4 flex-shrink-0 mt-0.5",
                      selectedKey === key
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-neutral-400 dark:text-neutral-600",
                    )}
                  />
                  <span
                    className={clsx(
                      "text-sm font-mono break-all leading-relaxed",
                      selectedKey === key
                        ? "text-brand-700 dark:text-brand-100 font-medium"
                        : "text-neutral-700 dark:text-neutral-300",
                    )}
                  >
                    {key}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Key Dialog */}
      <CreateKeyDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
}
