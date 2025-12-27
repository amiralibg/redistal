import { HTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md" | "lg";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { variant = "default", size = "md", className, children, ...props },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        className={clsx(
          "inline-flex items-center font-medium rounded-md transition-colors",

          // Variants
          {
            "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300":
              variant === "default",
            "bg-brand-100 dark:bg-blue-500/20 text-brand-700 dark:text-blue-300":
              variant === "primary",
            "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300":
              variant === "success",
            "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300":
              variant === "warning",
            "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300":
              variant === "danger",
            "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300":
              variant === "info",
          },

          // Sizes
          {
            "px-2 py-0.5 text-xs": size === "sm",
            "px-2.5 py-1 text-sm": size === "md",
            "px-3 py-1.5 text-base": size === "lg",
          },

          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";
