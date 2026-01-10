import React from 'react';

export function Badge({
    children,
    variant = 'neutral',
    className = ''
}) {
    const variants = {
        neutral: "bg-swiss-neutral-100 text-swiss-neutral-700 border-swiss-neutral-200",
        success: "bg-green-50 text-green-700 border-green-200",
        warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
        error: "bg-red-50 text-red-700 border-red-200",
        info: "bg-medical-teal-weak text-medical-teal border-medical-teal/20",
        brand: "bg-medilec-accent-weak text-medilec-accent border-medilec-accent/20"
    };

    return (
        <span
            className={`
        inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
        ${variants[variant]} 
        ${className}
      `}
        >
            {children}
        </span>
    );
}
