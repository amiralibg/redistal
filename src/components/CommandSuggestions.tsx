import { useEffect, useRef } from "react";
import { Terminal, Key, Hash, List } from "lucide-react";
import clsx from "clsx";
import type { RedisCommand } from "../lib/redis-commands";
import type { ContextSuggestion } from "../lib/context-suggestions";

interface CommandSuggestionsProps {
  suggestions: RedisCommand[] | ContextSuggestion[];
  selectedIndex: number;
  onSelect: (item: RedisCommand | ContextSuggestion) => void;
  position: { top: number; left: number };
  isContextSuggestions?: boolean;
}

export function CommandSuggestions({
  suggestions,
  selectedIndex,
  onSelect,
  position,
}: CommandSuggestionsProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to selected item
  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  const isCommand = (
    item: RedisCommand | ContextSuggestion,
  ): item is RedisCommand => {
    return "syntax" in item;
  };

  const getIcon = (item: RedisCommand | ContextSuggestion) => {
    if (isCommand(item)) {
      return (
        <Terminal className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
      );
    }
    switch (item.type) {
      case "key":
        return <Key className="w-3.5 h-3.5 text-info-600 dark:text-info-400" />;
      case "field":
        return (
          <Hash className="w-3.5 h-3.5 text-warning-600 dark:text-warning-400" />
        );
      case "index":
      case "member":
        return (
          <List className="w-3.5 h-3.5 text-success-600 dark:text-success-400" />
        );
      default:
        return <Terminal className="w-3.5 h-3.5 text-neutral-500" />;
    }
  };

  return (
    <div
      className="absolute z-50 w-[500px] bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl overflow-hidden"
      style={{
        bottom: "calc(100% + 8px)",
        left: position.left,
        transform: "translateY(0)",
      }}
    >
      <div className="max-h-[300px] overflow-y-auto">
        {suggestions.map((item, index) => {
          const isCmd = isCommand(item);
          const key = isCmd ? item.name : `${item.type}-${item.value}`;

          return (
            <button
              key={key}
              ref={index === selectedIndex ? selectedRef : null}
              onClick={() => onSelect(item)}
              className={clsx(
                "w-full text-left px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0 transition-colors",
                "hover:bg-neutral-200 dark:hover:bg-neutral-800",
                index === selectedIndex && "bg-neutral-200 dark:bg-neutral-800",
              )}
            >
              {isCmd ? (
                // Command suggestion
                <>
                  <div className="flex items-center gap-2 mb-1">
                    {getIcon(item)}
                    <span className="font-mono text-sm font-semibold text-brand-600 dark:text-brand-400">
                      {item.name}
                    </span>
                    {item.complexity && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-500 ml-auto">
                        {item.complexity}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-1.5 line-clamp-1">
                    {item.summary}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-500 font-mono bg-neutral-50 dark:bg-neutral-950 px-2 py-1 rounded">
                    {item.syntax}
                  </div>
                </>
              ) : (
                // Context suggestion (key, field, member, index)
                <div className="flex items-center gap-2">
                  {getIcon(item)}
                  <span className="font-mono text-sm text-neutral-900 dark:text-neutral-100">
                    {item.value}
                  </span>
                  {item.description && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-500 ml-auto">
                      {item.description}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
