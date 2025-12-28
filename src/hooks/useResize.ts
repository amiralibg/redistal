import { useCallback, useEffect, useRef, useState } from "react";

interface UseResizeOptions {
  initialSize: number;
  minSize: number;
  maxSize: number;
  direction: "horizontal" | "vertical";
  onResize?: (size: number) => void;
  persistKey?: string;
}

export function useResize({
  initialSize,
  minSize,
  maxSize,
  direction,
  onResize,
  persistKey,
}: UseResizeOptions) {
  // Load initial size from localStorage if persistKey exists
  const getInitialSize = () => {
    if (persistKey) {
      try {
        const stored = localStorage.getItem(persistKey);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= minSize && parsed <= maxSize) {
            return parsed;
          }
        }
      } catch (error) {
        // localStorage not available or error reading - fall back to initialSize
        console.warn(`Failed to load persisted size for ${persistKey}:`, error);
      }
    }
    return initialSize;
  };

  const [size, setSize] = useState(getInitialSize);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;

      const container = resizeRef.current.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      let newSize: number;

      if (direction === "horizontal") {
        // Horizontal resize: calculate based on mouse X position
        newSize = e.clientX - rect.left;
      } else {
        // Vertical resize: calculate based on mouse Y position from bottom
        newSize = rect.bottom - e.clientY;
      }

      // Clamp size between min and max
      newSize = Math.max(minSize, Math.min(maxSize, newSize));

      setSize(newSize);
      onResize?.(newSize);

      // Persist to localStorage if key provided
      if (persistKey) {
        try {
          localStorage.setItem(persistKey, newSize.toString());
        } catch (error) {
          console.warn(`Failed to persist size for ${persistKey}:`, error);
        }
      }
    },
    [isResizing, direction, minSize, maxSize, onResize, persistKey],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor =
        direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp, direction]);

  return {
    size,
    isResizing,
    resizeRef,
    handleMouseDown,
  };
}
