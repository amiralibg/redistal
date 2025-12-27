import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Search, RefreshCw } from "lucide-react";
import { redisApi } from "../lib/tauri-api";
import { useToast } from "../lib/toast-context";
import { Button, Input, ConfirmDialog, Select } from "./ui";
import { StreamEntry } from "../types/redis";

interface StreamEditorProps {
  connectionId: string;
  keyName: string;
  safeMode: boolean;
  onRefresh?: () => void;
}

export function StreamEditor({
  connectionId,
  keyName,
  safeMode,
  onRefresh,
}: StreamEditorProps) {
  const toast = useToast();
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingEntry, setAddingEntry] = useState(false);
  const [newFields, setNewFields] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [count, setCount] = useState(100);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const result = await redisApi.streamGetRange(
        connectionId,
        keyName,
        "-",
        "+",
        count,
      );

      setEntries(result.entries);
    } catch (error) {
      console.error("Failed to load stream entries:", error);
      toast.error("Load failed", "Failed to load stream entries");
    } finally {
      setLoading(false);
    }
  }, [connectionId, keyName, count, toast]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleAddEntry = async () => {
    // Filter out empty fields
    const validFields = newFields.filter((f) => f.key.trim() && f.value.trim());

    if (validFields.length === 0) {
      toast.error("Validation error", "At least one field is required");
      return;
    }

    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify stream in safe mode");
      return;
    }

    try {
      const fieldsObj = validFields.reduce(
        (acc, f) => {
          acc[f.key.trim()] = f.value.trim();
          return acc;
        },
        {} as Record<string, string>,
      );

      const entryId = await redisApi.streamAddEntry(
        connectionId,
        keyName,
        fieldsObj,
      );

      setNewFields([{ key: "", value: "" }]);
      setAddingEntry(false);
      await loadEntries();
      toast.success("Entry added", `Added entry with ID: ${entryId}`);
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to add entry";
      toast.error("Add failed", errorMsg);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify stream in safe mode");
      setDeleteConfirm(null);
      return;
    }

    try {
      await redisApi.streamDeleteEntry(connectionId, keyName, entryId);
      await loadEntries();
      setDeleteConfirm(null);
      toast.success("Entry deleted", `Deleted entry ${entryId}`);
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to delete entry";
      toast.error("Delete failed", errorMsg);
    }
  };

  const addFieldRow = () => {
    setNewFields([...newFields, { key: "", value: "" }]);
  };

  const removeFieldRow = (index: number) => {
    if (newFields.length > 1) {
      setNewFields(newFields.filter((_, i) => i !== index));
    }
  };

  const updateField = (index: number, key: string, value: string) => {
    const updated = [...newFields];
    updated[index] = { key, value };
    setNewFields(updated);
  };

  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      entry.id.toLowerCase().includes(searchLower) ||
      Object.entries(entry.fields).some(
        ([k, v]) =>
          k.toLowerCase().includes(searchLower) ||
          v.toLowerCase().includes(searchLower),
      )
    );
  });

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      {/* Toolbar */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search entries by ID or fields..."
            leftIcon={<Search className="w-4 h-4" />}
            className="flex-1"
          />
          <div className="flex items-center gap-2">
            <Button
              onClick={loadEntries}
              variant="outline"
              size="sm"
              loading={loading}
              title="Refresh entries"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setAddingEntry(true)}
              variant="primary"
              className="min-w-36.25 text-sm"
              disabled={safeMode}
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
            {searchTerm && ` (${filteredEntries.length} filtered)`}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 dark:text-neutral-400">
              Showing:
            </span>
            <Select
              value={count}
              onChange={(value) => setCount(Number(value))}
              options={[
                { value: 50, label: "50 entries" },
                { value: 100, label: "100 entries" },
                { value: 500, label: "500 entries" },
                { value: 1000, label: "1000 entries" },
              ]}
              size="sm"
            />
          </div>
        </div>
      </div>

      {/* Add Entry Form */}
      {addingEntry && (
        <div className="p-4 bg-brand-50 dark:bg-brand-500/10 border-b border-brand-200 dark:border-brand-800">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Add New Entry (Auto-generated ID)
            </div>
            {newFields.map((field, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={field.key}
                  onChange={(e) =>
                    updateField(index, e.target.value, field.value)
                  }
                  placeholder="Field name"
                  className="flex-1"
                />
                <Input
                  type="text"
                  value={field.value}
                  onChange={(e) =>
                    updateField(index, field.key, e.target.value)
                  }
                  placeholder="Field value"
                  className="flex-1"
                />
                {newFields.length > 1 && (
                  <Button
                    onClick={() => removeFieldRow(index)}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Button onClick={addFieldRow} variant="outline" size="sm">
                <Plus className="w-4 h-4" />
                Add Field
              </Button>
              <div className="flex-1" />
              <Button
                onClick={handleAddEntry}
                variant="primary"
                size="sm"
                disabled={newFields.every(
                  (f) => !f.key.trim() || !f.value.trim(),
                )}
              >
                Add Entry
              </Button>
              <Button
                onClick={() => {
                  setAddingEntry(false);
                  setNewFields([{ key: "", value: "" }]);
                }}
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-3 mx-auto" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Loading entries...
              </p>
            </div>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {searchTerm ? "No entries match your search" : "Stream is empty"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
                        ID:
                      </span>
                      <span className="text-sm font-mono text-brand-600 dark:text-brand-400">
                        {entry.id}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteConfirm(entry.id)}
                    className="p-1.5 text-neutral-400 hover:text-error-light dark:hover:text-error-dark transition-colors"
                    title="Delete entry"
                    disabled={safeMode}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded p-3 space-y-2">
                  {Object.entries(entry.fields).map(([field, value]) => (
                    <div key={field} className="flex gap-3 text-xs">
                      <span className="font-semibold text-neutral-600 dark:text-neutral-400 min-w-25">
                        {field}:
                      </span>
                      <span className="font-mono text-neutral-700 dark:text-neutral-300 break-all flex-1">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteEntry(deleteConfirm)}
        title="Delete Entry"
        message={
          <div>
            <p className="mb-2">Are you sure you want to delete this entry?</p>
            <p className="font-mono text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded break-all">
              {deleteConfirm}
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
