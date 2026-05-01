import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  promotionTitle?: string;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  promotionTitle,
}: DeleteConfirmationModalProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Подтвердите удаление"
      message={
        <>
          Вы уверены, что хотите удалить акцию{' '}
          <strong>{promotionTitle}</strong>?
        </>
      }
      description="Это действие нельзя отменить."
      confirmText="Удалить"
      cancelText="Отмена"
      variant="danger"
    />
  );
}
