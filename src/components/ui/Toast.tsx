import { useEffect, useState } from "react";
import { X, CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";
import clsx from "clsx";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastComponentProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const typeStyles = {
  success: {
    bg: "bg-success-light/10 dark:bg-success-dark/10",
    border: "border-success-light/20 dark:border-success-dark/20",
    icon: "text-success-light dark:text-success-dark",
    iconBg: "bg-success-light/20 dark:bg-success-dark/20",
    progress: "bg-success-light dark:bg-success-dark",
  },
  error: {
    bg: "bg-error-light/10 dark:bg-error-dark/10",
    border: "border-error-light/20 dark:border-error-dark/20",
    icon: "text-error-light dark:text-error-dark",
    iconBg: "bg-error-light/20 dark:bg-error-dark/20",
    progress: "bg-error-light dark:bg-error-dark",
  },
  warning: {
    bg: "bg-warning-light/10 dark:bg-warning-dark/10",
    border: "border-warning-light/20 dark:border-warning-dark/20",
    icon: "text-warning-light dark:text-warning-dark",
    iconBg: "bg-warning-light/20 dark:bg-warning-dark/20",
    progress: "bg-warning-light dark:bg-warning-dark",
  },
  info: {
    bg: "bg-info-light/10 dark:bg-info-dark/10",
    border: "border-info-light/20 dark:border-info-dark/20",
    icon: "text-info-light dark:text-info-dark",
    iconBg: "bg-info-light/20 dark:bg-info-dark/20",
    progress: "bg-info-light dark:bg-info-dark",
  },
};

export function ToastComponent({ toast, onClose }: ToastComponentProps) {
  const Icon = icons[toast.type];
  const styles = typeStyles[toast.type];
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      const startTime = Date.now();

      // Animate progress bar
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);
      }, 16); // ~60fps

      const timer = setTimeout(() => {
        onClose(toast.id);
      }, duration);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [toast.id, toast.duration, onClose]);

  return (
    <div
      className={clsx(
        "relative overflow-hidden flex items-start gap-3 p-4 rounded-xl border",
        "backdrop-blur-xl shadow-soft-xl min-w-[320px] max-w-md",
        "bg-white/90 dark:bg-neutral-900/90",
        "animate-slide-down transition-all duration-300 hover:scale-105",
        styles.border,
      )}
    >
      {/* Colored background accent */}
      <div className={clsx("absolute inset-0 opacity-50", styles.bg)} />

      {/* Content */}
      <div className="relative flex items-start gap-3 w-full">
        <div className={clsx("p-2 rounded-lg", styles.iconBg)}>
          <Icon className={clsx("w-5 h-5", styles.icon)} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-0.5">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {toast.message}
            </p>
          )}
        </div>

        <button
          onClick={() => onClose(toast.id)}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-200/30 dark:bg-neutral-800/30">
        <div
          className={clsx(
            "h-full transition-all duration-100 ease-linear",
            styles.progress,
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}
