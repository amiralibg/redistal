import { HTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-lg transition-all duration-200',
          'bg-white dark:bg-neutral-900',

          // Variants
          {
            'border border-neutral-200 dark:border-neutral-800': variant === 'default' || variant === 'bordered',
            'shadow-soft-lg hover:shadow-soft-xl': variant === 'elevated',
          },

          // Padding
          {
            'p-0': padding === 'none',
            'p-3': padding === 'sm',
            'p-4': padding === 'md',
            'p-6': padding === 'lg',
          },

          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
