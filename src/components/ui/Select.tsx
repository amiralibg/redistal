import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import clsx from "clsx";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  className?: string;
  size?: "sm" | "md";
}

export function Select({
  value,
  onChange,
  options,
  className,
  size = "md",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">(
    "bottom",
  );
  const [horizontalAlign, setHorizontalAlign] = useState<"left" | "right">(
    "left",
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  /* ---------------- Close on outside click ---------------- */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  /* ---------------- Viewport-aware positioning ---------------- */
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const frame = requestAnimationFrame(() => {
      const container = containerRef.current!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const maxDropdownHeight = 240; // max-h-60
      const minDropdownWidth = Math.max(container.width, 150); // min-w-37.5
      const margin = 8;

      /* Vertical */
      const spaceBelow = viewportHeight - container.bottom - margin;
      const spaceAbove = container.top - margin;

      if (spaceBelow < maxDropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition("top");
      } else {
        setDropdownPosition("bottom");
      }

      /* Horizontal */
      const spaceRight = viewportWidth - container.left - margin;
      const spaceLeft = container.right - margin;

      if (spaceRight < minDropdownWidth && spaceLeft > spaceRight) {
        setHorizontalAlign("right");
      } else {
        setHorizontalAlign("left");
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={clsx(
          "flex items-center justify-between gap-2 border rounded-lg transition-all",
          "bg-white dark:bg-neutral-800",
          "border-neutral-300 dark:border-neutral-700",
          "hover:bg-neutral-50 dark:hover:bg-neutral-700",
          "focus:outline-none focus:border-transparent",
          "text-neutral-900 dark:text-neutral-100",
          {
            "px-3 py-1.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "ring-2 ring-brand-500 dark:ring-brand-400": isOpen,
          },
        )}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown
          className={clsx(
            "w-4 h-4 transition-transform text-neutral-500 dark:text-neutral-400",
            { "rotate-180": isOpen },
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={clsx(
            "absolute z-50 min-w-37.5 max-w-[calc(100vw-16px)]",
            "bg-white dark:bg-neutral-800",
            "border border-neutral-200 dark:border-neutral-700",
            "rounded-lg shadow-lg overflow-hidden",
            "animate-in fade-in duration-200",
            {
              /* Horizontal */
              "left-0": horizontalAlign === "left",
              "right-0": horizontalAlign === "right",

              /* Vertical */
              "mt-1 slide-in-from-top-2": dropdownPosition === "bottom",
              "bottom-full mb-1 slide-in-from-bottom-2":
                dropdownPosition === "top",
            },
          )}
        >
          <div className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={clsx(
                  "w-full flex items-center justify-between gap-2 transition-colors",
                  "hover:bg-neutral-100 dark:hover:bg-neutral-700",
                  {
                    "px-3 py-2 text-xs": size === "sm",
                    "px-4 py-2.5 text-sm": size === "md",
                    "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300":
                      option.value === value,
                    "text-neutral-700 dark:text-neutral-300":
                      option.value !== value,
                  },
                )}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
