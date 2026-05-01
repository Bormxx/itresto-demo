'use client';

import { ReactNode } from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  icon?: ReactNode;
}

const variantConfig = {
  danger: {
    icon: '❌',
    confirmVariant: 'danger' as const,
  },
  warning: {
    icon: '⚠️',
    confirmVariant: 'primary' as const,
  },
  info: {
    icon: 'ℹ️',
    confirmVariant: 'primary' as const,
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'info',
  loading = false,
  icon,
}: ConfirmDialogProps) {
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
          <div className="text-center text-4xl">
            {displayIcon}
          </div>
        )}
        
        <div className="text-gray-700">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
        
        {description && (
          <p className="text-sm text-gray-600">
            {description}
          </p>
        )}
        
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            variant={config.confirmVariant}
            isLoading={loading}
            className="w-full sm:w-auto"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
