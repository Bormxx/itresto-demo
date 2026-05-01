"use client";

import { InfoModal } from '@/components/ui/InfoModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface ValidationErrorDialogProps {
  error: string | null;
  onClose: () => void;
}

export function ValidationErrorDialog({ error, onClose }: ValidationErrorDialogProps) {
  return (
    <InfoModal
      isOpen={!!error}
      onClose={onClose}
      title="Ошибка валидации"
      message={<div className="whitespace-pre-wrap">{error}</div>}
      variant="error"
      buttonText="Понятно"
    />
  );
}

interface DeleteConfirmation {
  shiftId: string;
  shiftName: string;
}

interface DeleteConfirmationDialogProps {
  confirmation: DeleteConfirmation | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  confirmation,
  loading,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  return (
    <ConfirmDialog
      isOpen={!!confirmation}
      onClose={onCancel}
      onConfirm={onConfirm}
      title="Подтверждение удаления"
      message={
        <>
          Вы действительно хотите удалить смену{' '}
          <span className="font-semibold">"{confirmation?.shiftName}"</span>?
        </>
      }
      description="Это действие нельзя отменить."
      confirmText={loading ? 'Удаление...' : 'Удалить'}
      cancelText="Отмена"
      variant="danger"
      loading={loading}
    />
  );
}
