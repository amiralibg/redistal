import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, Check, X, Search } from "lucide-react";
import { redisApi } from "../lib/tauri-api";
import { useToast } from "../lib/toast-context";
import { Button, Input, ConfirmDialog } from "./ui";

interface HashEditorProps {
  connectionId: string;
  keyName: string;
  safeMode: boolean;
  onRefresh?: () => void;
}

export function HashEditor({
  connectionId,
  keyName,
  safeMode,
  onRefresh,
}: HashEditorProps) {
  const toast = useToast();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedValue, setEditedValue] = useState("");
  const [addingField, setAddingField] = useState(false);
  const [newField, setNewField] = useState("");
  const [newValue, setNewValue] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadFields = useCallback(
    async (resetCursor = false) => {
      setLoading(true);
      try {
        const currentCursor = resetCursor ? 0 : cursor;
        const result = await redisApi.getHashFields(
          connectionId,
          keyName,
          currentCursor,
          100,
        );

        if (resetCursor) {
          setFields(result.fields);
        } else {
          setFields((prev) => ({ ...prev, ...result.fields }));
        }

        setCursor(result.cursor);
        setHasMore(result.has_more);
      } catch (error) {
        console.error("Failed to load hash fields:", error);
        toast.error("Load failed", "Failed to load hash fields");
      } finally {
        setLoading(false);
      }
    },
    [connectionId, keyName, cursor, toast],
  );

  useEffect(() => {
    loadFields(true);
  }, [connectionId, keyName]);

  const handleAddField = async () => {
    if (!newField.trim()) return;

    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify hash in safe mode");
      return;
    }

    try {
      await redisApi.hashSetField(
        connectionId,
        keyName,
        newField.trim(),
        newValue,
      );
      setFields((prev) => ({ ...prev, [newField.trim()]: newValue }));
      setNewField("");
      setNewValue("");
      setAddingField(false);
      toast.success("Field added", `Added field "${newField.trim()}"`);
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to add field";
      toast.error("Add failed", errorMsg);
    }
  };

  const handleEditField = async (field: string) => {
    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify hash in safe mode");
      return;
    }

    try {
      await redisApi.hashSetField(connectionId, keyName, field, editedValue);
      setFields((prev) => ({ ...prev, [field]: editedValue }));
      setEditingField(null);
      toast.success("Field updated", `Updated field "${field}"`);
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to update field";
      toast.error("Update failed", errorMsg);
    }
  };

  const handleDeleteField = async (field: string) => {
    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify hash in safe mode");
      setDeleteConfirm(null);
      return;
    }

    try {
      await redisApi.hashDeleteField(connectionId, keyName, field);
      setFields((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
      setDeleteConfirm(null);
      toast.success("Field deleted", `Deleted field "${field}"`);
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to delete field";
      toast.error("Delete failed", errorMsg);
    }
  };

  const filteredFields = Object.entries(fields).filter(
    ([field, value]) =>
      field.toLowerCase().includes(searchTerm.toLowerCase()) ||
      value.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      {/* Toolbar */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search fields or values..."
            leftIcon={<Search className="w-4 h-4" />}
            className="flex-1"
          />
          <Button
            onClick={() => setAddingField(true)}
            variant="primary"
            className="min-w-36.25 text-sm"
            disabled={safeMode}
          >
            <Plus className="w-4 h-4" />
            Add Field
          </Button>
        </div>

        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {Object.keys(fields).length}{" "}
          {Object.keys(fields).length === 1 ? "field" : "fields"}
          {searchTerm && ` (${filteredFields.length} filtered)`}
        </div>
      </div>

      {/* Add Field Form */}
      {addingField && (
        <div className="p-4 bg-brand-50 dark:bg-brand-500/10 border-b border-brand-200 dark:border-brand-800">
          <div className="space-y-3">
            <Input
              type="text"
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              placeholder="Field name"
              autoFocus
            />
            <Input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Field value"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAddField}
                variant="primary"
                size="sm"
                disabled={!newField.trim()}
              >
                <Check className="w-4 h-4" />
                Add
              </Button>
              <Button
                onClick={() => {
                  setAddingField(false);
                  setNewField("");
                  setNewValue("");
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fields List */}
      <div className="flex-1 overflow-y-auto">
        {loading && Object.keys(fields).length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-3 mx-auto" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Loading fields...
              </p>
            </div>
          </div>
        ) : filteredFields.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {searchTerm
                ? "No fields match your search"
                : "No fields in this hash"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
                  Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
                  Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredFields.map(([field, value]) => (
                <tr
                  key={field}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-neutral-700 dark:text-neutral-300 break-all max-w-xs">
                    {field}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-neutral-600 dark:text-neutral-400">
                    {editingField === field ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={editedValue}
                          onChange={(e) => setEditedValue(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <Button
                          onClick={() => handleEditField(field)}
                          variant="primary"
                          size="sm"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setEditingField(null)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="break-all">{value}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingField !== field && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingField(field);
                            setEditedValue(value);
                          }}
                          className="p-1.5 text-neutral-500 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-400 transition-colors"
                          title="Edit field"
                          disabled={safeMode}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(field)}
                          className="p-1.5 text-neutral-500 hover:text-error-light dark:text-neutral-400 dark:hover:text-error-dark transition-colors"
                          title="Delete field"
                          disabled={safeMode}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Load More */}
        {hasMore && !searchTerm && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              onClick={() => loadFields(false)}
              variant="outline"
              loading={loading}
              className="w-full"
            >
              Load More
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteField(deleteConfirm)}
        title="Delete Field"
        message={
          <div>
            <p className="mb-2">Are you sure you want to delete this field?</p>
            <p className="font-mono text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded break-all">
              {deleteConfirm}
            </p>
          </div>
        }
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
