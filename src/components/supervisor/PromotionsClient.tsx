'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import { PageHeaderSkeleton, TableRowSkeleton } from '@/components/ui/Skeleton';
import { PromotionTable } from '@/components/supervisor/promotions';
import { 
  PromotionFormModal, 
  DeleteConfirmationModal, 
  PromotionDetailsModal 
} from '@/components/supervisor/promotions/modals';
import { usePromotions } from '@/hooks/usePromotions';
import { usePromotionForm } from '@/hooks/usePromotionForm';

interface PromotionsClientProps {
  restaurantId: string;
}

export default function PromotionsClient({ restaurantId }: PromotionsClientProps) {
  const t = useTranslations('promotions');
  
  // Custom hooks
  const promotionsData = usePromotions(restaurantId);
  const formState = usePromotionForm();

  useEffect(() => {
    promotionsData.fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    formState.setError(null);

    const result = await promotionsData.savePromotion(formState.formData, formState.editingPromotion);
    
    if (result.success) {
      formState.closeModal();
    } else {
      formState.setError(result.error || 'Failed to save promotion');
    }
  };

  const handleDelete = async () => {
    if (!formState.deletingPromotion) return;

    const result = await promotionsData.deletePromotion(formState.deletingPromotion);
    
    if (result.success) {
      formState.closeDeleteModal();
    }
  };

  if (promotionsData.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Скидка</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Период</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={5} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('title') || 'Промоакции'}</h1>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={promotionsData.includeInactive}
              onChange={(e) => promotionsData.setIncludeInactive(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">{t('showInactive') || 'Показать неактивные'}</span>
          </label>
          <Button onClick={formState.openCreateModal}>
            {t('createPromotion') || 'Создать акцию'}
          </Button>
        </div>
      </div>

      {formState.error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {formState.error}
          <button
            onClick={() => formState.setError(null)}
            className="ml-4 underline"
          >
            Закрыть
          </button>
        </div>
      )}

      {promotionsData.promotions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {t('noPromotions') || 'Нет созданных акций'}
        </div>
      ) : (
        <PromotionTable
          promotions={promotionsData.promotions}
          onRowClick={formState.openDetailsModal}
          onEdit={formState.openEditModal}
          onDelete={formState.openDeleteModal}
          onToggleActive={promotionsData.toggleActive}
        />
      )}

      {/* Modals */}
      <PromotionFormModal
        isOpen={formState.isModalOpen}
        onClose={formState.closeModal}
        onSubmit={handleSubmit}
        editingPromotion={formState.editingPromotion}
        formData={formState.formData}
        setFormData={formState.setFormData}
        menuItems={promotionsData.menuItems}
        clients={promotionsData.clients}
        error={formState.error}
        t={t}
      />

      <DeleteConfirmationModal
        isOpen={formState.isDeleteModalOpen}
        onClose={formState.closeDeleteModal}
        onConfirm={handleDelete}
        promotionTitle={formState.deletingPromotion?.title}
      />

      <PromotionDetailsModal
        isOpen={formState.isDetailsModalOpen}
        onClose={formState.closeDetailsModal}
        promotion={formState.viewingPromotion}
        onEdit={formState.handleEditFromDetails}
      />
    </div>
  );
}
