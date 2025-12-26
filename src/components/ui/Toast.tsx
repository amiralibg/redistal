import { useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import clsx from 'clsx';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

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

export function ToastComponent({ toast, onClose }: ToastComponentProps) {
  const Icon = icons[toast.type];

  useEffect(() => {
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg shadow-soft-xl border animate-slide-up',
        'bg-white dark:bg-neutral-900 min-w-[320px] max-w-md',
        {
          'border-success-light dark:border-success-dark': toast.type === 'success',
          'border-error-light dark:border-error-dark': toast.type === 'error',
          'border-warning-light dark:border-warning-dark': toast.type === 'warning',
          'border-info-light dark:border-info-dark': toast.type === 'info',
        }
      )}
    >
      <Icon
        className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', {
          'text-success-light dark:text-success-dark': toast.type === 'success',
          'text-error-light dark:text-error-dark': toast.type === 'error',
          'text-warning-light dark:text-warning-dark': toast.type === 'warning',
          'text-info-light dark:text-info-dark': toast.type === 'info',
        })}
      />

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-0.5">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {toast.message}
          </p>
        )}
      </div>

      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <X className="w-4 h-4 text-neutral-400" />
      </button>
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
