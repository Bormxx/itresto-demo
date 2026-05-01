'use client';

import { ReactNode } from 'react';
import Modal from './Modal';
import Button from './Button';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info';
  buttonText?: string;
  icon?: ReactNode;
  footer?: ReactNode;
}

const variantConfig = {
  success: {
    icon: '✅',
    iconColor: 'text-green-600',
    titleColor: 'text-green-700',
  },
  error: {
    icon: '❌',
    iconColor: 'text-red-600',
    titleColor: 'text-red-700',
  },
  warning: {
    icon: '⚠️',
    iconColor: 'text-yellow-600',
    titleColor: 'text-yellow-700',
  },
  info: {
    icon: 'ℹ️',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-700',
  },
};

export function InfoModal({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  buttonText = 'Понятно',
  icon,
  footer,
}: InfoModalProps) {
  const config = variantConfig[variant];
  const displayIcon = icon ?? config.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        {displayIcon && (
          <div className={`text-center text-5xl ${config.iconColor}`}>
            {displayIcon}
          </div>
        )}
        
        <div className="text-gray-700 text-center">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
        
        {footer || (
          <div className="pt-4">
            <Button
              onClick={onClose}
              variant="primary"
              className="w-full"
            >
              {buttonText}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
