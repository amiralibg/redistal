import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'default', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-900',
          'disabled:opacity-50 disabled:cursor-not-allowed',

          // Variants
          {
            'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700':
              variant === 'default',
            'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100':
              variant === 'ghost',
            'text-error-light dark:text-error-dark hover:bg-red-50 dark:hover:bg-red-900/20':
              variant === 'danger',
          },

          // Sizes
          {
            'p-1.5': size === 'sm',
            'p-2': size === 'md',
            'p-3': size === 'lg',
          },

          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
