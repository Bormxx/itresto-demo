'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  breadcrumbs?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  action,
  breadcrumbs,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs && (
        <div className="mb-4">
          {breadcrumbs}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#111827] flex items-center gap-3">
            {icon && <span className="text-4xl">{icon}</span>}
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-[#6b7280]">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div>
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
