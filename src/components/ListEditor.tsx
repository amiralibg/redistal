import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, Check, X, Search } from "lucide-react";
import { redisApi } from "../lib/tauri-api";
import { useToast } from "../lib/toast-context";
import { Button, Input } from "./ui";

interface ListEditorProps {
  connectionId: string;
  keyName: string;
  safeMode: boolean;
  onRefresh?: () => void;
}

export function ListEditor({
  connectionId,
  keyName,
  safeMode,
  onRefresh,
}: ListEditorProps) {
  const toast = useToast();
  const [items, setItems] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedValue, setEditedValue] = useState("");
  const [addingValue, setAddingValue] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [pushSide, setPushSide] = useState<"left" | "right">("right");
  const [page, setPage] = useState(0);
  const pageSize = 100;

  const loadItems = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const result = await redisApi.getListRange(
          connectionId,
          keyName,
          pageNum * pageSize,
          pageSize,
        );

        setItems(result.items);
        setTotalCount(result.total_count);
      } catch (error) {
        console.error("Failed to load list items:", error);
        toast.error("Load failed", "Failed to load list items");
      } finally {
        setLoading(false);
      }
    },
    [connectionId, keyName, toast],
  );

  useEffect(() => {
    loadItems(page);
  }, [connectionId, keyName, page, loadItems]);

  const handlePush = async () => {
    if (!newValue.trim()) return;

    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify list in safe mode");
      return;
    }

    try {
      await redisApi.listPush(connectionId, keyName, newValue, pushSide);
      setNewValue("");
      setAddingValue(false);
      await loadItems(page);
      toast.success(
        "Item added",
        `Added item to ${pushSide === "left" ? "beginning" : "end"}`,
      );
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to add item";
      toast.error("Add failed", errorMsg);
    }
  };

  const handleEditItem = async (index: number) => {
    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify list in safe mode");
      return;
    }

    try {
      const actualIndex = page * pageSize + index;
      await redisApi.listSetIndex(
        connectionId,
        keyName,
        actualIndex,
        editedValue,
      );
      await loadItems(page);
      setEditingIndex(null);
      toast.success("Item updated", `Updated item at index ${actualIndex}`);
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to update item";
      toast.error("Update failed", errorMsg);
    }
  };

  const handleRemoveItem = async (value: string) => {
    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify list in safe mode");
      return;
    }

    try {
      // Remove all occurrences (count=0)
      await redisApi.listRemove(connectionId, keyName, 0, value);
      await loadItems(page);
      toast.success("Item removed", "Removed all matching items");
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to remove item";
      toast.error("Remove failed", errorMsg);
    }
  };

  const filteredItems = searchTerm
    ? items.filter((item) =>
        item.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : items;

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      {/* Toolbar */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            leftIcon={<Search className="w-4 h-4" />}
            className="flex-1"
          />
          <Button
            onClick={() => setAddingValue(true)}
            variant="primary"
            size="sm"
            disabled={safeMode}
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            {totalCount} {totalCount === 1 ? "item" : "items"}
            {searchTerm && ` (${filteredItems.length} filtered)`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                variant="ghost"
                size="sm"
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-neutral-600 dark:text-neutral-400">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                variant="ghost"
                size="sm"
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Item Form */}
      {addingValue && (
        <div className="p-4 bg-brand-50 dark:bg-brand-500/10 border-b border-brand-200 dark:border-brand-800">
          <div className="space-y-3">
            <Input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Item value"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 dark:text-neutral-300">
                  Add to:
                </label>
                <select
                  value={pushSide}
                  onChange={(e) =>
                    setPushSide(e.target.value as "left" | "right")
                  }
                  className="px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  <option value="left">Beginning (LPUSH)</option>
                  <option value="right">End (RPUSH)</option>
                </select>
              </div>
              <Button
                onClick={handlePush}
                variant="primary"
                size="sm"
                disabled={!newValue.trim()}
              >
                <Check className="w-4 h-4" />
                Add
              </Button>
              <Button
                onClick={() => {
                  setAddingValue(false);
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

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-3 mx-auto" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Loading items...
              </p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {searchTerm ? "No items match your search" : "List is empty"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide w-20">
                  Index
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
              {filteredItems.map((item, index) => {
                const actualIndex = page * pageSize + index;
                return (
                  <tr
                    key={index}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-neutral-500 dark:text-neutral-400">
                      {actualIndex}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-neutral-700 dark:text-neutral-300">
                      {editingIndex === index ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={editedValue}
                            onChange={(e) => setEditedValue(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            onClick={() => handleEditItem(index)}
                            variant="primary"
                            size="sm"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => setEditingIndex(null)}
                            variant="ghost"
                            size="sm"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="break-all">{item}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingIndex !== index && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingIndex(index);
                              setEditedValue(item);
                            }}
                            className="p-1.5 text-neutral-500 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-400 transition-colors"
                            title="Edit item"
                            disabled={safeMode}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item)}
                            className="p-1.5 text-neutral-500 hover:text-error-light dark:text-neutral-400 dark:hover:text-error-dark transition-colors"
                            title="Remove all matching items"
                            disabled={safeMode}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
