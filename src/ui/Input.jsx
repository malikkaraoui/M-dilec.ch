import React, { forwardRef } from 'react';

export const Input = forwardRef(({
    label,
    error,
    helpText,
    id,
    className = '',
    type = 'text',
    ...props
}, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-swiss-neutral-700 mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    ref={ref}
                    id={inputId}
                    type={type}
                    className={`
            w-full rounded-md border bg-white px-3 py-2.5 text-sm text-swiss-neutral-900 
            placeholder:text-swiss-neutral-400 transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-opacity-50
            ${error
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                            : 'border-swiss-neutral-200 focus:border-medilec-accent focus:ring-medilec-accent/20 hover:border-swiss-neutral-300'
                        }
            ${className}
          `}
                    {...props}
                />
            </div>
            {helpText && !error && (
                <p className="mt-1.5 text-xs text-swiss-neutral-500">{helpText}</p>
            )}
            {error && (
                <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
