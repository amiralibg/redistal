import {
  useEffect,
  useState,
  useRef,
  MutableRefObject,
  useCallback,
  useMemo,
} from "react";
import { Search, RefreshCw, Key, Database, Plus } from "lucide-react";
import { VirtualList } from "./VirtualList";
import { useRedisStore } from "../store/useRedisStore";
import { redisApi } from "../lib/tauri-api";
import { Input, IconButton, Badge, Button } from "./ui";
import { CreateKeyDialog } from "./CreateKeyDialog";
import clsx from "clsx";

interface KeyBrowserProps {
  onRefreshKeysRef?: MutableRefObject<(() => void) | null>;
  onFocusSearchRef?: MutableRefObject<(() => void) | null>;
}

// Custom hook for debounced values
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);

  // Debounced search pattern (500ms delay)
  const debouncedPattern = useDebounce(localPattern, 500);

  // Memoize filtered keys for performance
  const filteredKeys = useMemo(() => {
    if (!localPattern || localPattern === "*") return keys;

    // Client-side filtering for instant feedback
    const lowerPattern = localPattern.toLowerCase().replace(/\*/g, "");
    return keys.filter((key) => key.toLowerCase().includes(lowerPattern));
  }, [keys, localPattern]);

  const loadKeys = useCallback(async () => {
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
  }, [activeConnectionId, searchPattern, setKeys]);

  // Update search pattern when debounced value changes
  useEffect(() => {
    if (debouncedPattern !== searchPattern) {
      setSearchPattern(debouncedPattern);
    }
  }, [debouncedPattern, searchPattern, setSearchPattern]);

  useEffect(() => {
    if (activeConnectionId) {
      loadKeys();
    }
  }, [activeConnectionId, searchPattern, loadKeys]);

  // Measure container height for virtual list
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Ensure we have a valid height
        if (rect.height > 0) {
          setListHeight(rect.height);
        }
      }
    };

    // Initial measurement with slight delay to ensure layout is ready
    const timer = setTimeout(updateHeight, 100);

    window.addEventListener("resize", updateHeight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

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
  }, [onRefreshKeysRef, onFocusSearchRef, loadKeys]);

  const handleKeyClick = useCallback(
    async (key: string) => {
      if (!activeConnectionId) return;

      setSelectedKey(key);
      try {
        const keyInfo = await redisApi.getKeyInfo(activeConnectionId, key);
        setSelectedKeyInfo(keyInfo);
      } catch (error) {
        console.error("Failed to load key info:", error);
      }
    },
    [activeConnectionId, setSelectedKey, setSelectedKeyInfo],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchPattern(localPattern);
  };

  // Render function for virtual list items
  const renderKeyItem = useCallback(
    (key: string) => {
      const isSelected = selectedKey === key;

      return (
        <button
          onClick={() => handleKeyClick(key)}
          className={clsx(
            "w-full h-full text-left px-4 py-3 transition-all duration-200 border-b border-neutral-200 dark:border-neutral-800",
            "hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
            "focus:outline-none focus:bg-neutral-50 dark:focus:bg-neutral-800/50",
            isSelected
              ? "bg-brand-50 dark:bg-brand-500/10 border-l-3 border-l-brand-600 dark:border-l-brand-500 pl-[13px]"
              : "",
          )}
        >
          <div className="flex items-start gap-2.5">
            <Key
              className={clsx(
                "w-4 h-4 shrink-0 mt-0.5",
                isSelected
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-neutral-400 dark:text-neutral-600",
              )}
            />
            <span
              className={clsx(
                "text-sm font-mono break-all leading-relaxed",
                isSelected
                  ? "text-brand-700 dark:text-brand-300 font-medium"
                  : "text-neutral-700 dark:text-neutral-300",
              )}
            >
              {key}
            </span>
          </div>
        </button>
      );
    },
    [selectedKey, handleKeyClick],
  );

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
            {filteredKeys.length} {filteredKeys.length === 1 ? "key" : "keys"}{" "}
            {keys.length !== filteredKeys.length && `(${keys.length} total)`}
          </span>
          {filteredKeys.length > 1000 && (
            <Badge variant="info" size="sm">
              Virtualized
            </Badge>
          )}
        </div>
      </div>

      {/* Key List */}
      <div className="flex-1 overflow-hidden" ref={containerRef}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mb-3" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Loading keys...
            </p>
          </div>
        ) : filteredKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6">
            <Key className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mb-3" />
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              No Keys Found
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs">
              {keys.length > 0
                ? "No keys match your search pattern"
                : "Try adjusting your search pattern or create a new key"}
            </p>
          </div>
        ) : (
          <VirtualList
            items={filteredKeys}
            height={listHeight}
            itemHeight={65}
            renderItem={renderKeyItem}
            className="scrollbar-thin"
          />
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
