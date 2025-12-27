import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { redisApi } from "../lib/tauri-api";
import { useToast } from "../lib/toast-context";
import { Button, Input, ConfirmDialog } from "./ui";

interface ZSetEditorProps {
  connectionId: string;
  keyName: string;
  safeMode: boolean;
  onRefresh?: () => void;
}

type SortDirection = "asc" | "desc";

export function ZSetEditor({
  connectionId,
  keyName,
  safeMode,
  onRefresh,
}: ZSetEditorProps) {
  const toast = useToast();
  const [items, setItems] = useState<[string, number][]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editedScore, setEditedScore] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [newMember, setNewMember] = useState("");
  const [newScore, setNewScore] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<"score" | "member">("score");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const pageSize = 100;

  const loadItems = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const result = await redisApi.getZSetRange(
          connectionId,
          keyName,
          pageNum * pageSize,
          pageSize,
        );

        setItems(result.items);
        setTotalCount(result.total_count);
      } catch (error) {
        console.error("Failed to load zset items:", error);
        toast.error("Load failed", "Failed to load sorted set items");
      } finally {
        setLoading(false);
      }
    },
    [connectionId, keyName, toast],
  );

  useEffect(() => {
    loadItems(page);
  }, [connectionId, keyName, page, loadItems]);

  const handleAddMember = async () => {
    if (!newMember.trim() || newScore === "") return;

    const score = parseFloat(newScore);
    if (isNaN(score)) {
      toast.error("Invalid score", "Score must be a valid number");
      return;
    }

    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify sorted set in safe mode");
      return;
    }

    try {
      await redisApi.zsetAddMember(
        connectionId,
        keyName,
        newMember.trim(),
        score,
      );
      setNewMember("");
      setNewScore("");
      setAddingMember(false);
      await loadItems(page);
      toast.success("Member added", `Added "${newMember.trim()}" with score ${score}`);
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to add member";
      toast.error("Add failed", errorMsg);
    }
  };

  const handleEditScore = async (member: string) => {
    const score = parseFloat(editedScore);
    if (isNaN(score)) {
      toast.error("Invalid score", "Score must be a valid number");
      return;
    }

    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify sorted set in safe mode");
      return;
    }

    try {
      await redisApi.zsetAddMember(connectionId, keyName, member, score);
      await loadItems(page);
      setEditingMember(null);
      toast.success("Score updated", `Updated score for "${member}"`);
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to update score";
      toast.error("Update failed", errorMsg);
    }
  };

  const handleDeleteMember = async (member: string) => {
    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify sorted set in safe mode");
      setDeleteConfirm(null);
      return;
    }

    try {
      await redisApi.zsetRemoveMember(connectionId, keyName, member);
      await loadItems(page);
      setDeleteConfirm(null);
      toast.success("Member removed", `Removed "${member}"`);
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to remove member";
      toast.error("Remove failed", errorMsg);
    }
  };

  const filteredItems = items.filter(
    ([member]) => member.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Client-side sorting for local data
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === "score") {
      return sortDir === "asc" ? a[1] - b[1] : b[1] - a[1];
    } else {
      return sortDir === "asc"
        ? a[0].localeCompare(b[0])
        : b[0].localeCompare(a[0]);
    }
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const toggleSort = (column: "score" | "member") => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-neutral-900">
      {/* Toolbar */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search members..."
            leftIcon={<Search className="w-4 h-4" />}
            className="flex-1"
          />
          <Button
            onClick={() => setAddingMember(true)}
            variant="primary"
            size="sm"
            disabled={safeMode}
          >
            <Plus className="w-4 h-4" />
            Add Member
          </Button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            {totalCount} {totalCount === 1 ? "member" : "members"}
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

      {/* Add Member Form */}
      {addingMember && (
        <div className="p-4 bg-brand-50 dark:bg-brand-500/10 border-b border-brand-200 dark:border-brand-800">
          <div className="space-y-3">
            <Input
              type="text"
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              placeholder="Member value"
              autoFocus
            />
            <Input
              type="number"
              step="any"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              placeholder="Score (e.g., 1.5)"
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAddMember}
                variant="primary"
                size="sm"
                disabled={!newMember.trim() || newScore === ""}
              >
                <Check className="w-4 h-4" />
                Add
              </Button>
              <Button
                onClick={() => {
                  setAddingMember(false);
                  setNewMember("");
                  setNewScore("");
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

      {/* Items Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-3 mx-auto" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Loading members...
              </p>
            </div>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {searchTerm ? "No members match your search" : "Sorted set is empty"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  onClick={() => toggleSort("member")}
                >
                  <div className="flex items-center gap-2">
                    Member
                    {sortBy === "member" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide w-32 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  onClick={() => toggleSort("score")}
                >
                  <div className="flex items-center gap-2">
                    Score
                    {sortBy === "score" &&
                      (sortDir === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      ))}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {sortedItems.map(([member, score]) => (
                <tr
                  key={member}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-neutral-700 dark:text-neutral-300 break-all">
                    {member}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-neutral-600 dark:text-neutral-400">
                    {editingMember === member ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="any"
                          value={editedScore}
                          onChange={(e) => setEditedScore(e.target.value)}
                          className="w-24"
                          autoFocus
                        />
                        <Button
                          onClick={() => handleEditScore(member)}
                          variant="primary"
                          size="sm"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setEditingMember(null)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      score
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingMember !== member && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingMember(member);
                            setEditedScore(score.toString());
                          }}
                          className="p-1.5 text-neutral-500 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-400 transition-colors"
                          title="Edit score"
                          disabled={safeMode}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(member)}
                          className="p-1.5 text-neutral-500 hover:text-error-light dark:text-neutral-400 dark:hover:text-error-dark transition-colors"
                          title="Remove member"
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
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteMember(deleteConfirm)}
        title="Remove Member"
        message={
          <div>
            <p className="mb-2">Are you sure you want to remove this member?</p>
            <p className="font-mono text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded break-all">
              {deleteConfirm}
            </p>
          </div>
        }
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
}
