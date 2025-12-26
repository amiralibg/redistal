import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
            {label}
            {props.required && <span className="text-error-light dark:text-error-dark ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            className={clsx(
              'w-full px-3 py-2 rounded-lg border transition-all duration-200',
              'bg-white dark:bg-neutral-900',
              'text-neutral-900 dark:text-neutral-100',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-600',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              {
                // Default state
                'border-neutral-300 dark:border-neutral-700 focus:border-brand-500 focus:ring-brand-500/20':
                  !error,
                // Error state
                'border-error-light dark:border-error-dark focus:border-error-light focus:ring-error-light/20':
                  error,
                // With left icon
                'pl-10': leftIcon,
                // With right icon
                'pr-10': rightIcon,
              },
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
              {rightIcon}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <p
            className={clsx('mt-1.5 text-sm', {
              'text-error-light dark:text-error-dark': error,
              'text-neutral-500 dark:text-neutral-400': !error && helperText,
            })}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
