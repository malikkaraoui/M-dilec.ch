import React from 'react';

export function Card({
    children,
    className = '',
    padding = 'p-6',
    ...props
}) {
    return (
        <div
            className={`
        bg-white rounded-lg border border-swiss-neutral-200 shadow-swiss-sm 
        transition-shadow duration-300 hover:shadow-swiss-md
        ${padding} 
        ${className}
      `}
            {...props}
        >
            {children}
        </div>
    );
}
