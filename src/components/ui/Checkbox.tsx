'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, helperText, size = 'md', className = '', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    };

    const checkboxElement = (
      <input
        ref={ref}
        type="checkbox"
        className={`
          rounded border-gray-300 text-blue-600
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          transition-colors
          ${error ? 'border-red-500' : ''}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      />
    );

    if (!label && !helperText && !error) {
      return checkboxElement;
    }

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          {checkboxElement}
        </div>
        {(label || helperText || error) && (
          <div className="ml-3">
            {label && (
              <label className="block text-sm font-medium text-gray-700">
                {label}
                {props.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;

// Radio компонент как бонус
interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, error, helperText, size = 'md', className = '', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    };

    const radioElement = (
      <input
        ref={ref}
        type="radio"
        className={`
          border-gray-300 text-blue-600
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          transition-colors
          ${error ? 'border-red-500' : ''}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      />
    );

    if (!label && !helperText && !error) {
      return radioElement;
    }

    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          {radioElement}
        </div>
        {(label || helperText || error) && (
          <div className="ml-3">
            {label && (
              <label className="block text-sm font-medium text-gray-700">
                {label}
                {props.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
