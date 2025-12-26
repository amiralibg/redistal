import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  Save,
  Trash2,
  Clock,
  FileJson,
  FileText,
  Database,
} from "lucide-react";
import { useRedisStore } from "../store/useRedisStore";
import { redisApi } from "../lib/tauri-api";
import { useTheme } from "../lib/theme-context";
import { useToast } from "../lib/toast-context";
import { Button, Badge, Input, ConfirmDialog } from "./ui";
import clsx from "clsx";

export function ValueViewer() {
  const {
    activeConnectionId,
    selectedKey,
    selectedKeyInfo,
    setSelectedKey,
    setKeys,
    keys,
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

  useEffect(() => {
    if (activeConnectionId && selectedKey) {
      loadValue();
    } else {
      setValue("");
      setEditedValue("");
    }
  }, [activeConnectionId, selectedKey]);

  useEffect(() => {
    if (selectedKeyInfo) {
      setTtl(selectedKeyInfo.ttl);
      setNewTtl(selectedKeyInfo.ttl >= 0 ? selectedKeyInfo.ttl.toString() : "");
    }
  }, [selectedKeyInfo]);

  const loadValue = async () => {
    if (!activeConnectionId || !selectedKey) return;

    setLoading(true);
    try {
      const result = await redisApi.getValue(activeConnectionId, selectedKey);
      setValue(result.value);
      setEditedValue(result.value);
    } catch (error) {
      console.error("Failed to load value:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!activeConnectionId || !selectedKey) return;

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
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white font-mono truncate">
                {selectedKey}
              </h3>
            </div>
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
                {getLanguage() === "json" && (
                  <Badge variant="success" size="sm">
                    <FileJson className="w-3 h-3 mr-1" />
                    JSON
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
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="danger"
              size="sm"
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
              <Button onClick={handleSaveTtl} variant="primary" size="sm">
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
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Loading value...
            </p>
          </div>
        ) : (
          <Editor
            height="100%"
            language={getLanguage()}
            value={editedValue}
            onChange={(val) => setEditedValue(val || "")}
            theme={theme === "dark" ? "vs-dark" : "light"}
            options={{
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
