import { useState, useEffect, useRef } from "react";
import { Search, Command } from "lucide-react";
import { Dialog } from "./ui";
import clsx from "clsx";

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  keywords?: string[];
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

export function CommandPalette({
  isOpen,
  onClose,
  actions,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter actions based on search
  const filteredActions = actions.filter((action) => {
    const searchLower = search.toLowerCase();
    const labelMatch = action.label.toLowerCase().includes(searchLower);
    const descMatch = action.description?.toLowerCase().includes(searchLower);
    const keywordMatch = action.keywords?.some((k) =>
      k.toLowerCase().includes(searchLower),
    );
    return labelMatch || descMatch || keywordMatch;
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) =>
          i < filteredActions.length - 1 ? i + 1 : i,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg" title="">
      <div className="relative">
        {/* Search Input */}
        <div className="relative border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for commands..."
            className="w-full pl-12 pr-4 py-3 text-lg bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <kbd className="px-2 py-1 text-xs font-mono bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-700">
              ↑↓
            </kbd>
            <span className="text-xs text-neutral-500">to navigate</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-2">
          {filteredActions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Command className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-700 mb-3" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No commands found
              </p>
            </div>
          ) : (
            filteredActions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => {
                  action.action();
                  onClose();
                }}
                className={clsx(
                  "w-full px-4 py-3 flex items-center gap-3 transition-colors",
                  "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                  index === selectedIndex &&
                    "bg-brand-50 dark:bg-brand-900/20 border-l-2 border-l-brand-600",
                )}
              >
                {action.icon && (
                  <div className="text-neutral-400 dark:text-neutral-500">
                    {action.icon}
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="font-medium text-neutral-900 dark:text-white">
                    {action.label}
                  </div>
                  {action.description && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {action.description}
                    </div>
                  )}
                </div>
                {action.shortcut && (
                  <kbd className="px-2 py-1 text-xs font-mono bg-neutral-100 dark:bg-neutral-800 rounded border border-neutral-300 dark:border-neutral-700">
                    {action.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
