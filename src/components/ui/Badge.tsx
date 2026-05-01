'use client';

import { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  className = '',
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 border border-gray-300',
    primary: 'bg-blue-100 text-blue-800 border border-blue-200',
    success: 'bg-green-100 text-green-800 border border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    danger: 'bg-red-100 text-red-800 border border-red-200',
    info: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const roundedClass = rounded ? 'rounded-full' : 'rounded';

  return (
    <span
      className={`
        inline-flex items-center justify-center font-medium
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${roundedClass}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'processing';
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const t = useTranslations('ui.status');
  
  const statusConfig = {
    active: { label: t('active'), variant: 'success' as const },
    inactive: { label: t('inactive'), variant: 'default' as const },
    pending: { label: t('pending'), variant: 'warning' as const },
    completed: { label: t('completed'), variant: 'success' as const },
    cancelled: { label: t('cancelled'), variant: 'danger' as const },
    processing: { label: t('processing'), variant: 'info' as const },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
