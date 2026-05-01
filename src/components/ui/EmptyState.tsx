import React from 'react';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="mb-4">
          <Icon className="w-16 h-16 text-gray-300" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-gray-500 mb-6 max-w-md">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-[rgb(var(--color-primary))] text-white rounded-lg hover:opacity-90 transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
