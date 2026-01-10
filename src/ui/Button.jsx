import React from 'react';

/**
 * Swiss Medical Button Component
 * Variant: primary (Red), secondary (Neutral), ghost (Text)
 */
export function Button({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    disabled = false,
    className = '',
    type = 'button',
    ...props
}) {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

    const variants = {
        primary: "bg-medilec-accent text-white shadow-swiss-sm hover:bg-[#b01e12] focus-visible:ring-medilec-accent/50",
        secondary: "bg-white border border-swiss-neutral-200 text-swiss-neutral-900 shadow-swiss-sm hover:bg-swiss-neutral-50 hover:border-swiss-neutral-300 focus-visible:ring-swiss-neutral-400/50",
        ghost: "bg-transparent text-swiss-neutral-700 hover:bg-swiss-neutral-100/50 hover:text-swiss-neutral-900"
    };

    const sizes = {
        sm: "text-xs px-3 py-1.5 rounded-sm",
        md: "text-sm px-4 py-2.5 rounded-md",
        lg: "text-base px-6 py-3 rounded-lg"
    };

    return (
        <button
            type={type}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {children}
        </button>
    );
}
