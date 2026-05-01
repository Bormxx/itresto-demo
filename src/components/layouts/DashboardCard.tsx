'use client';

import { ReactNode } from 'react';

interface DashboardCardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  icon?: ReactNode;
  variant?: 'default' | 'gradient' | 'bordered';
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
  headerAction?: ReactNode;
}

const variantClasses = {
  default: 'bg-[#ffffff] border border-[#e5e7eb] rounded-lg shadow-sm',
  gradient: 'bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg',
  bordered: 'bg-[#ffffff] border-2 border-[#e5e7eb] rounded-lg',
};

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function DashboardCard({
  children,
  title,
  description,
  icon,
  variant = 'default',
  padding = 'md',
  className = '',
  headerAction,
}: DashboardCardProps) {
  const hasHeader = title || description || icon || headerAction;

  return (
    <div className={`${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>
      {hasHeader && (
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {(title || icon) && (
                <h3 className="text-lg font-semibold text-[#111827] flex items-center gap-2">
                  {icon && <span className="text-2xl">{icon}</span>}
                  {title}
                </h3>
              )}
              {description && (
                <p className="mt-1 text-sm text-[#6b7280]">
                  {description}
                </p>
              )}
            </div>
            {headerAction && (
              <div className="ml-4">
                {headerAction}
              </div>
            )}
          </div>
        </div>
      )}
      <div>
        {children}
      </div>
    </div>
  );
}
