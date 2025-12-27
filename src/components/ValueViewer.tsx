import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  Save,
  Trash2,
  Clock,
  FileJson,
  FileText,
  Database,
  Edit2,
  Copy,
  Check,
  ClipboardCopy,
} from "lucide-react";
import { useRedisStore } from "../store/useRedisStore";
import { redisApi } from "../lib/tauri-api";
import { useTheme } from "../lib/theme-context";
import { useToast } from "../lib/toast-context";
import { Button, Badge, Input, ConfirmDialog } from "./ui";
import { HashEditor } from "./HashEditor";
import { ListEditor } from "./ListEditor";
import { SetEditor } from "./SetEditor";
import { ZSetEditor } from "./ZSetEditor";
import { StreamEditor } from "./StreamEditor";
import { copyToClipboard, formatValueForClipboard } from "../lib/clipboard";
import clsx from "clsx";

export function ValueViewer() {
  const {
    activeConnectionId,
    selectedKey,
    selectedKeyInfo,
    setSelectedKey,
    setSelectedKeyInfo,
    setKeys,
    keys,
    safeMode,
  } = useRedisStore();
  const { theme } = useTheme();
  const toast = useToast();
  const [value, setValue] = useState("");
  const [editedValue, setEditedValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ttl, setTtl] = useState<number>(-1);
  const [editingTtl, setEditingTtl] = useState(false);
  const [newTtl, setNewTtl] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renamingKey, setRenamingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [copyingKey, setCopyingKey] = useState(false);
  const [copyKeyName, setCopyKeyName] = useState("");
  const [keySize, setKeySize] = useState<number | null>(null);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Size threshold: 1MB
  const SIZE_THRESHOLD = 1024 * 1024;

  useEffect(() => {
    if (activeConnectionId && selectedKey) {
      checkSizeAndLoad();
    } else {
      setValue("");
      setEditedValue("");
      setKeySize(null);
      setShowSizeWarning(false);
    }
  }, [activeConnectionId, selectedKey]);

  useEffect(() => {
    if (selectedKeyInfo) {
      setTtl(selectedKeyInfo.ttl);
      setNewTtl(selectedKeyInfo.ttl >= 0 ? selectedKeyInfo.ttl.toString() : "");
    }
  }, [selectedKeyInfo]);

  const checkSizeAndLoad = async () => {
    if (!activeConnectionId || !selectedKey) return;

    setLoading(true);
    setShowSizeWarning(false);

    try {
      // First, check the memory usage
      const memoryUsage = await redisApi.getKeyMemoryUsage(
        activeConnectionId,
        selectedKey,
      );

      setKeySize(memoryUsage);

      // If size is larger than threshold, show warning and don't auto-load
      if (memoryUsage && memoryUsage > SIZE_THRESHOLD) {
        setShowSizeWarning(true);
        setLoading(false);
        return;
      }

      // Size is acceptable, load the value
      await loadValue();
    } catch (error) {
      console.error("Failed to check size:", error);
      // If size check fails, just load the value anyway
      await loadValue();
    }
  };

  const loadValue = async () => {
    if (!activeConnectionId || !selectedKey) return;

    setLoading(true);
    try {
      const result = await redisApi.getValue(activeConnectionId, selectedKey);
      setValue(result.value);
      setEditedValue(result.value);
      setShowSizeWarning(false);
    } catch (error) {
      console.error("Failed to load value:", error);
      toast.error("Load failed", "Failed to load key value");
    } finally {
      setLoading(false);
    }
  };

  const handleForceLoad = async () => {
    await loadValue();
  };

  const handleSave = async () => {
    if (!activeConnectionId || !selectedKey) return;

    if (safeMode) {
      toast.warning(
        "Safe mode enabled",
        "Cannot modify values in safe mode. Disable safe mode to make changes.",
      );
      return;
    }

    setSaving(true);
    try {
      await redisApi.setValue(activeConnectionId, selectedKey, editedValue);
      setValue(editedValue);
      toast.success("Value saved", `Successfully updated ${selectedKey}`);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to save value";
      console.error("Failed to save value:", error);
      toast.error("Save failed", errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!activeConnectionId || !selectedKey) return;

    if (safeMode) {
      toast.warning(
        "Safe mode enabled",
        "Cannot delete keys in safe mode. Disable safe mode to make changes.",
      );
      setShowDeleteConfirm(false);
      return;
    }

    try {
      await redisApi.deleteKey(activeConnectionId, selectedKey);
      setKeys(keys.filter((k) => k !== selectedKey));
      setSelectedKey(null);
      toast.success("Key deleted", `Successfully deleted ${selectedKey}`);
      setShowDeleteConfirm(false);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to delete key";
      console.error("Failed to delete key:", error);
      toast.error("Delete failed", errorMsg);
    }
  };

  const handleSaveTtl = async () => {
    if (!activeConnectionId || !selectedKey) return;

    if (safeMode) {
      toast.warning(
        "Safe mode enabled",
        "Cannot modify TTL in safe mode. Disable safe mode to make changes.",
      );
      setEditingTtl(false);
      return;
    }

    const ttlValue = newTtl === "" ? -1 : parseInt(newTtl);
    if (isNaN(ttlValue)) return;

    try {
      await redisApi.setTtl(activeConnectionId, selectedKey, ttlValue);
      setTtl(ttlValue);
      setEditingTtl(false);
      const message =
        ttlValue === -1
          ? "TTL removed (key will not expire)"
          : `TTL set to ${ttlValue} seconds`;
      toast.success("TTL updated", message);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to set TTL";
      console.error("Failed to set TTL:", error);
      toast.error("TTL update failed", errorMsg);
    }
  };

  const handleRenameKey = async () => {
    if (!activeConnectionId || !selectedKey || !newKeyName.trim()) return;

    if (safeMode) {
      toast.warning(
        "Safe mode enabled",
        "Cannot rename keys in safe mode. Disable safe mode to make changes.",
      );
      setRenamingKey(false);
      return;
    }

    try {
      await redisApi.executeCommand(
        activeConnectionId,
        `RENAME "${selectedKey.replace(/"/g, '\\"')}" "${newKeyName.trim().replace(/"/g, '\\"')}"`,
      );

      // Update keys list
      const updatedKeys = keys.map((k) =>
        k === selectedKey ? newKeyName.trim() : k,
      );
      setKeys(updatedKeys);
      setSelectedKey(newKeyName.trim());
      setRenamingKey(false);

      toast.success(
        "Key renamed",
        `Renamed "${selectedKey}" to "${newKeyName.trim()}"`,
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to rename key";
      toast.error("Rename failed", errorMsg);
    }
  };

  const handleCopyKey = async () => {
    if (!activeConnectionId || !selectedKey || !copyKeyName.trim()) return;

    if (safeMode) {
      toast.warning(
        "Safe mode enabled",
        "Cannot copy keys in safe mode. Disable safe mode to make changes.",
      );
      setCopyingKey(false);
      return;
    }

    try {
      // Use DUMP and RESTORE to copy the key with all its properties
      const dumpResult = await redisApi.executeCommand(
        activeConnectionId,
        `DUMP "${selectedKey.replace(/"/g, '\\"')}"`,
      );

      if (dumpResult && dumpResult !== "(nil)") {
        // Get TTL
        const ttlResult = await redisApi.executeCommand(
          activeConnectionId,
          `PTTL "${selectedKey.replace(/"/g, '\\"')}"`,
        );
        const pttl = parseInt(ttlResult) > 0 ? parseInt(ttlResult) : 0;

        // Restore to new key
        await redisApi.executeCommand(
          activeConnectionId,
          `RESTORE "${copyKeyName.trim().replace(/"/g, '\\"')}" ${pttl} ${dumpResult}`,
        );
      }

      // Add to keys list and select
      if (!keys.includes(copyKeyName.trim())) {
        setKeys([...keys, copyKeyName.trim()]);
      }
      setSelectedKey(copyKeyName.trim());
      setCopyingKey(false);

      toast.success(
        "Key copied",
        `Created copy "${copyKeyName.trim()}" from "${selectedKey}"`,
      );
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to copy key";
      toast.error("Copy failed", errorMsg);
    }
  };

  const handleCopyValueToClipboard = async () => {
    if (!selectedKey || !value) return;

    try {
      const formattedValue = formatValueForClipboard(
        value,
        selectedKeyInfo?.key_type || "unknown",
        selectedKey,
      );

      await copyToClipboard(formattedValue);

      setCopiedToClipboard(true);
      toast.success("Copied to clipboard", "Value copied as JSON");

      // Reset icon after 2 seconds
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Copy failed", "Failed to copy value to clipboard");
    }
  };

  const getLanguage = () => {
    if (!selectedKeyInfo) return "text";

    try {
      JSON.parse(editedValue);
      return "json";
    } catch {
      return "text";
    }
  };

  const isModified = editedValue !== value;

  if (!selectedKey) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-neutral-50 dark:bg-neutral-950 text-center">
        <Database className="w-20 h-20 text-neutral-300 dark:text-neutral-700 mb-4" />
        <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          No Key Selected
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
          Select a key from the browser to view and edit its value
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-4">
        {/* Key Info */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {renamingKey ? (
              <div className="flex items-center gap-2 mb-2">
                <Input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="New key name"
                  className="flex-1"
                  autoFocus
                />
                <Button
                  onClick={handleRenameKey}
                  variant="primary"
                  size="sm"
                  disabled={!newKeyName.trim() || safeMode}
                >
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setRenamingKey(false);
                    setNewKeyName("");
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white font-mono truncate">
                  {selectedKey}
                </h3>
                <button
                  onClick={() => {
                    setRenamingKey(true);
                    setNewKeyName(selectedKey);
                  }}
                  className="p-1 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                  title="Rename key"
                  disabled={safeMode}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            {selectedKeyInfo && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={
                    selectedKeyInfo.key_type === "string"
                      ? "info"
                      : selectedKeyInfo.key_type === "list"
                        ? "success"
                        : selectedKeyInfo.key_type === "set"
                          ? "warning"
                          : selectedKeyInfo.key_type === "zset"
                            ? "primary"
                            : "default"
                  }
                  size="sm"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  {selectedKeyInfo.key_type.toUpperCase()}
                </Badge>
                {selectedKeyInfo.size !== undefined && (
                  <Badge variant="default" size="sm">
                    {selectedKeyInfo.size}{" "}
                    {selectedKeyInfo.size === 1 ? "item" : "items"}
                  </Badge>
                )}
                {keySize !== null && (
                  <Badge
                    variant={keySize > SIZE_THRESHOLD ? "warning" : "default"}
                    size="sm"
                  >
                    {keySize < 1024
                      ? `${keySize} B`
                      : keySize < 1024 * 1024
                        ? `${(keySize / 1024).toFixed(1)} KB`
                        : `${(keySize / 1024 / 1024).toFixed(2)} MB`}
                  </Badge>
                )}
                {getLanguage() === "json" && (
                  <Badge variant="success" size="sm">
                    <FileJson className="w-3 h-3 mr-1" />
                    JSON
                  </Badge>
                )}
                {selectedKeyInfo.encoding && (
                  <Badge
                    variant="default"
                    size="sm"
                    title="Redis encoding type"
                  >
                    <Database className="w-3 h-3 mr-1" />
                    {selectedKeyInfo.encoding}
                  </Badge>
                )}
                {selectedKeyInfo.refcount !== undefined && (
                  <Badge variant="default" size="sm" title="Reference count">
                    Refs: {selectedKeyInfo.refcount}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isModified && (
              <Button
                onClick={handleSave}
                loading={saving}
                variant="primary"
                size="sm"
                disabled={safeMode}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button
              onClick={handleCopyValueToClipboard}
              variant="secondary"
              size="sm"
              disabled={!value}
            >
              {copiedToClipboard ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-4 h-4" />
                  Copy Value
                </>
              )}
            </Button>
            {copyingKey ? (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={copyKeyName}
                  onChange={(e) => setCopyKeyName(e.target.value)}
                  placeholder="New key name"
                  className="w-48"
                  autoFocus
                />
                <Button
                  onClick={handleCopyKey}
                  variant="primary"
                  size="sm"
                  disabled={!copyKeyName.trim() || safeMode}
                >
                  Copy
                </Button>
                <Button
                  onClick={() => {
                    setCopyingKey(false);
                    setCopyKeyName("");
                  }}
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setCopyingKey(true);
                  setCopyKeyName(`${selectedKey}_copy`);
                }}
                variant="secondary"
                size="sm"
                disabled={safeMode}
              >
                <Copy className="w-4 h-4" />
                Copy
              </Button>
            )}
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="danger"
              size="sm"
              disabled={safeMode}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* TTL */}
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-neutral-400" />
          {editingTtl ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="number"
                value={newTtl}
                onChange={(e) => setNewTtl(e.target.value)}
                placeholder="TTL in seconds (-1 for no expiry)"
                className="flex-1 max-w-xs"
              />
              <Button
                onClick={handleSaveTtl}
                variant="primary"
                size="sm"
                disabled={safeMode}
              >
                Save
              </Button>
              <Button
                onClick={() => {
                  setEditingTtl(false);
                  setNewTtl(ttl >= 0 ? ttl.toString() : "");
                }}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTtl(true)}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <span className="font-medium">TTL:</span>{" "}
              <span
                className={clsx(
                  "font-mono",
                  ttl >= 0 && ttl < 60
                    ? "text-warning-light dark:text-warning-dark"
                    : ttl >= 0
                      ? "text-success-light dark:text-success-dark"
                      : "text-neutral-500 dark:text-neutral-400",
                )}
              >
                {ttl >= 0 ? `${ttl}s` : "No expiry"}
              </span>
              <span className="ml-2 text-xs text-neutral-400">
                (click to edit)
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {showSizeWarning ? (
          <div className="flex flex-col items-center justify-center h-full p-8 bg-warning-50 dark:bg-warning-950/20">
            <div className="max-w-md text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-warning-100 dark:bg-warning-900/30 rounded-full flex items-center justify-center">
                <Database className="w-8 h-8 text-warning-600 dark:text-warning-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Large Value Warning
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                This key contains a large value (
                {keySize
                  ? `${(keySize / 1024 / 1024).toFixed(2)} MB`
                  : "size unknown"}
                ). Loading it may slow down the application.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <Button onClick={handleForceLoad} variant="primary">
                  Load Anyway
                </Button>
                <Button onClick={() => setSelectedKey(null)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Loading value...
            </p>
          </div>
        ) : selectedKeyInfo?.key_type === "string" ? (
          <Editor
            height="100%"
            language={getLanguage()}
            value={editedValue}
            onChange={(val) => setEditedValue(val || "")}
            theme={theme === "dark" ? "vs-dark" : "light"}
            options={{
              readOnly: safeMode,
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily:
                "JetBrains Mono, Fira Code, Monaco, Courier New, monospace",
              wordWrap: "on",
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              renderWhitespace: "selection",
              tabSize: 2,
              insertSpaces: true,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
            }}
          />
        ) : selectedKeyInfo?.key_type === "hash" &&
          activeConnectionId &&
          selectedKey ? (
          <HashEditor
            connectionId={activeConnectionId}
            keyName={selectedKey}
            safeMode={safeMode}
            onRefresh={() => {
              // Refresh key info when data changes
              if (activeConnectionId && selectedKey) {
                redisApi
                  .getKeyInfo(activeConnectionId, selectedKey, false)
                  .then(setSelectedKeyInfo);
              }
            }}
          />
        ) : selectedKeyInfo?.key_type === "list" &&
          activeConnectionId &&
          selectedKey ? (
          <ListEditor
            connectionId={activeConnectionId}
            keyName={selectedKey}
            safeMode={safeMode}
            onRefresh={() => {
              if (activeConnectionId && selectedKey) {
                redisApi
                  .getKeyInfo(activeConnectionId, selectedKey, false)
                  .then(setSelectedKeyInfo);
              }
            }}
          />
        ) : selectedKeyInfo?.key_type === "set" &&
          activeConnectionId &&
          selectedKey ? (
          <SetEditor
            connectionId={activeConnectionId}
            keyName={selectedKey}
            safeMode={safeMode}
            onRefresh={() => {
              if (activeConnectionId && selectedKey) {
                redisApi
                  .getKeyInfo(activeConnectionId, selectedKey, false)
                  .then(setSelectedKeyInfo);
              }
            }}
          />
        ) : selectedKeyInfo?.key_type === "zset" &&
          activeConnectionId &&
          selectedKey ? (
          <ZSetEditor
            connectionId={activeConnectionId}
            keyName={selectedKey}
            safeMode={safeMode}
            onRefresh={() => {
              if (activeConnectionId && selectedKey) {
                redisApi
                  .getKeyInfo(activeConnectionId, selectedKey, false)
                  .then(setSelectedKeyInfo);
              }
            }}
          />
        ) : selectedKeyInfo?.key_type === "stream" &&
          activeConnectionId &&
          selectedKey ? (
          <StreamEditor
            connectionId={activeConnectionId}
            keyName={selectedKey}
            safeMode={safeMode}
            onRefresh={() => {
              if (activeConnectionId && selectedKey) {
                redisApi
                  .getKeyInfo(activeConnectionId, selectedKey, false)
                  .then(setSelectedKeyInfo);
              }
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-neutral-50 dark:bg-neutral-950">
            <FileText className="w-16 h-16 text-neutral-400 dark:text-neutral-600 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              {selectedKeyInfo?.key_type?.toUpperCase() || "UNSUPPORTED"} Type
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
              This key type is not yet supported.
            </p>
          </div>
        )}
      </div>

      {/* Modified Indicator */}
      {isModified && (
        <div className="px-4 py-2 bg-warning-light/10 dark:bg-warning-dark/10 border-t border-warning-light dark:border-warning-dark text-sm text-warning-light dark:text-warning-dark">
          <span className="font-medium">Unsaved changes</span> - Press Save to
          persist your edits
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Key"
        message={
          <div>
            <p className="mb-2">Are you sure you want to delete this key?</p>
            <p className="font-mono text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
              {selectedKey}
            </p>
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
