import clsx from "clsx";
import { GripVertical, GripHorizontal } from "lucide-react";

interface ResizeHandleProps {
  direction: "horizontal" | "vertical";
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing?: boolean;
}

export function ResizeHandle({
  direction,
  onMouseDown,
  isResizing = false,
}: ResizeHandleProps) {
  const isHorizontal = direction === "horizontal";

  return (
    <div
      className={clsx(
        "group relative flex items-center justify-center bg-neutral-200 dark:bg-neutral-800",
        "hover:bg-brand-500 dark:hover:bg-brand-600 transition-colors",
        {
          "cursor-col-resize w-1 h-full": isHorizontal,
          "cursor-row-resize h-1 w-full": !isHorizontal,
          "bg-brand-500 dark:bg-brand-600": isResizing,
        }
      )}
      onMouseDown={onMouseDown}
    >
      {/* Invisible wider hit area for easier grabbing */}
      <div
        className={clsx("absolute", {
          "w-3 h-full -left-1": isHorizontal,
          "h-3 w-full -top-1": !isHorizontal,
        })}
      />

      {/* Grip icon */}
      <div
        className={clsx(
          "absolute opacity-0 group-hover:opacity-100 transition-opacity",
          "text-white dark:text-neutral-200 pointer-events-none",
          {
            "opacity-100": isResizing,
          }
        )}
      >
        {isHorizontal ? (
          <GripVertical className="w-3 h-3" />
        ) : (
          <GripHorizontal className="w-3 h-3" />
        )}
      </div>
    </div>
  );
}
