'use client';

import { ReactNode, FormEvent } from 'react';
import Modal from './Modal';
import Button from './Button';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  title: string;
  children: ReactNode;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  submitDisabled?: boolean;
  footer?: ReactNode;
}

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  submitText = 'Сохранить',
  cancelText = 'Отмена',
  loading = false,
  size = 'md',
  submitDisabled = false,
  footer,
}: FormModalProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          {children}
        </div>
        
        {footer || (
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {cancelText}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              disabled={submitDisabled}
              className="w-full sm:w-auto"
            >
              {submitText}
            </Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
