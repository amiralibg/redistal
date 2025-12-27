import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { redisApi } from "../lib/tauri-api";
import { useToast } from "../lib/toast-context";
import { Button, Input, ConfirmDialog } from "./ui";

interface SetEditorProps {
  connectionId: string;
  keyName: string;
  safeMode: boolean;
  onRefresh?: () => void;
}

export function SetEditor({
  connectionId,
  keyName,
  safeMode,
  onRefresh,
}: SetEditorProps) {
  const toast = useToast();
  const [members, setMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [newMember, setNewMember] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadMembers = useCallback(
    async (resetCursor = false) => {
      setLoading(true);
      try {
        const currentCursor = resetCursor ? 0 : cursor;
        const result = await redisApi.getSetMembers(
          connectionId,
          keyName,
          currentCursor,
          100,
        );

        if (resetCursor) {
          setMembers(result.members);
        } else {
          setMembers((prev) => [...prev, ...result.members]);
        }

        setCursor(result.cursor);
        setHasMore(result.has_more);
      } catch (error) {
        console.error("Failed to load set members:", error);
        toast.error("Load failed", "Failed to load set members");
      } finally {
        setLoading(false);
      }
    },
    [connectionId, keyName, cursor, toast],
  );

  useEffect(() => {
    loadMembers(true);
  }, [connectionId, keyName]);

  const handleAddMember = async () => {
    if (!newMember.trim()) return;

    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify set in safe mode");
      return;
    }

    try {
      await redisApi.setAddMember(connectionId, keyName, newMember.trim());
      setMembers((prev) => [...prev, newMember.trim()]);
      setNewMember("");
      setAddingMember(false);
      toast.success("Member added", `Added member "${newMember.trim()}"`);
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to add member";
      toast.error("Add failed", errorMsg);
    }
  };

  const handleDeleteMember = async (member: string) => {
    if (safeMode) {
      toast.warning("Safe mode enabled", "Cannot modify set in safe mode");
      setDeleteConfirm(null);
      return;
    }

    try {
      await redisApi.setRemoveMember(connectionId, keyName, member);
      setMembers((prev) => prev.filter((m) => m !== member));
      setDeleteConfirm(null);
      toast.success("Member removed", `Removed member "${member}"`);
      onRefresh?.();
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to remove member";
      toast.error("Remove failed", errorMsg);
    }
  };

  const filteredMembers = members.filter((member) =>
    member.toLowerCase().includes(searchTerm.toLowerCase()),
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
            placeholder="Search members..."
            leftIcon={<Search className="w-4 h-4" />}
            className="flex-1"
          />
          <Button
            onClick={() => setAddingMember(true)}
            variant="primary"
            disabled={safeMode}
            className="min-w-36.25 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </Button>
        </div>

        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {members.length} {members.length === 1 ? "member" : "members"}
          {searchTerm && ` (${filteredMembers.length} filtered)`}
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddMember();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAddMember}
                variant="primary"
                size="sm"
                disabled={!newMember.trim()}
              >
                Add
              </Button>
              <Button
                onClick={() => {
                  setAddingMember(false);
                  setNewMember("");
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

      {/* Members List */}
      <div className="flex-1 overflow-y-auto">
        {loading && members.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-3 mx-auto" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Loading members...
              </p>
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {searchTerm ? "No members match your search" : "Set is empty"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredMembers.map((member, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
              >
                <span className="text-sm font-mono text-neutral-700 dark:text-neutral-300 break-all flex-1">
                  {member}
                </span>
                <button
                  onClick={() => setDeleteConfirm(member)}
                  className="p-1.5 text-neutral-400 hover:text-error-light dark:hover:text-error-dark transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove member"
                  disabled={safeMode}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && !searchTerm && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              onClick={() => loadMembers(false)}
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
