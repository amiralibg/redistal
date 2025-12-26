import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg ${
              variant === 'danger'
                ? 'bg-error-light/10 dark:bg-error-dark/10'
                : variant === 'warning'
                  ? 'bg-warning-light/10 dark:bg-warning-dark/10'
                  : 'bg-brand-50 dark:bg-brand-900/20'
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${
                variant === 'danger'
                  ? 'text-error-light dark:text-error-dark'
                  : variant === 'warning'
                    ? 'text-warning-light dark:text-warning-dark'
                    : 'text-brand-600 dark:text-brand-400'
              }`}
            />
          </div>
          <div className="flex-1">
            {typeof message === 'string' ? (
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                {message}
              </p>
            ) : (
              message
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button onClick={onClose} variant="outline" disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            variant={variant}
            loading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
