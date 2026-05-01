'use client';

import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl';
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '7xl': 'max-w-7xl',
};

export function DashboardLayout({ 
  children, 
  maxWidth = '7xl',
  className = '' 
}: DashboardLayoutProps) {
  return (
    <div className={`mx-auto ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  );
}
