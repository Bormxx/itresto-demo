import { useState, useCallback } from 'react';

interface Promotion {
  id: string;
  type: 'all_menu' | 'specific_item' | 'bogo' | 'time_based' | 'birthday';
  title: string;
  description: string | null;
  discountPercent: number | null;
  discountAmount: string | null;
  validFrom: string;
  validUntil: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  forAllClients: boolean;
  clientId: string | null;
  eventType: string | null;
  daysBeforeEvent: number | null;
  daysAfterEvent: number | null;
  birthdayPeriodDays: number | null;
  rules: string | null;
  isActive: boolean;
  items?: { id: string; name: any }[];
}

interface PromotionFormData {
  type: 'all_menu' | 'specific_item' | 'bogo' | 'time_based' | 'birthday';
  title: string;
  description: string;
  discountPercent: string;
  discountAmount: string;
  validFrom: string;
  validUntil: string;
  timeFrom: string;
  timeTo: string;
  forAllClients: boolean;
  clientId: string;
  eventType: string;
  daysBeforeEvent: string;
  daysAfterEvent: string;
  birthdayPeriodDays: string;
  rules: string;
  menuItemIds: string[];
  isActive: boolean;
  isIndefinite: boolean;
}

const initialFormData: PromotionFormData = {
  type: 'all_menu',
  title: '',
  description: '',
  discountPercent: '',
  discountAmount: '',
  validFrom: '',
  validUntil: '',
  timeFrom: '',
  timeTo: '',
  forAllClients: true,
  clientId: '',
  eventType: '',
  daysBeforeEvent: '',
  daysAfterEvent: '',
  birthdayPeriodDays: '',
  rules: '',
  menuItemIds: [],
  isActive: true,
  isIndefinite: false,
};

export function usePromotionForm() {
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Currently editing/viewing/deleting promotion
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [deletingPromotion, setDeletingPromotion] = useState<Promotion | null>(null);
  const [viewingPromotion, setViewingPromotion] = useState<Promotion | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<PromotionFormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);

  // Open form modal for creating new promotion
  const openCreateModal = useCallback(() => {
    setEditingPromotion(null);
    setFormData(initialFormData);
    setError(null);
    setIsModalOpen(true);
  }, []);

  // Open form modal for editing existing promotion
  const openEditModal = useCallback((promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      type: promotion.type,
      title: promotion.title,
      description: promotion.description || '',
      discountPercent: promotion.discountPercent?.toString() || '',
      discountAmount: promotion.discountAmount || '',
      validFrom: promotion.validFrom.split('T')[0],
      validUntil: promotion.validUntil ? promotion.validUntil.split('T')[0] : '',
      timeFrom: promotion.timeFrom || '',
      timeTo: promotion.timeTo || '',
      forAllClients: promotion.forAllClients,
      clientId: promotion.clientId || '',
      eventType: promotion.eventType || '',
      daysBeforeEvent: promotion.daysBeforeEvent?.toString() || '',
      daysAfterEvent: promotion.daysAfterEvent?.toString() || '',
      birthdayPeriodDays: promotion.birthdayPeriodDays?.toString() || '',
      rules: promotion.rules || '',
      menuItemIds: promotion.items?.map(item => item.id) || [],
      isActive: promotion.isActive,
      isIndefinite: !promotion.validUntil,
    });
    setError(null);
    setIsModalOpen(true);
  }, []);

  // Close form modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingPromotion(null);
    setFormData(initialFormData);
    setError(null);
  }, []);

  // Open delete confirmation modal
  const openDeleteModal = useCallback((promotion: Promotion) => {
    setDeletingPromotion(promotion);
    setIsDeleteModalOpen(true);
  }, []);

  // Close delete confirmation modal
  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setDeletingPromotion(null);
  }, []);

  // Open details modal
  const openDetailsModal = useCallback((promotion: Promotion) => {
    setViewingPromotion(promotion);
    setIsDetailsModalOpen(true);
  }, []);

  // Close details modal
  const closeDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false);
    setViewingPromotion(null);
  }, []);

  // Handle edit from details modal
  const handleEditFromDetails = useCallback((promotion: Promotion | null) => {
    if (promotion) {
      closeDetailsModal();
      openEditModal(promotion);
    }
  }, [closeDetailsModal, openEditModal]);

  return {
    // Modal state
    isModalOpen,
    isDeleteModalOpen,
    isDetailsModalOpen,
    
    // Current promotion references
    editingPromotion,
    deletingPromotion,
    viewingPromotion,
    
    // Form state
    formData,
    setFormData,
    error,
    setError,
    
    // Modal actions
    openCreateModal,
    openEditModal,
    closeModal,
    openDeleteModal,
    closeDeleteModal,
    openDetailsModal,
    closeDetailsModal,
    handleEditFromDetails,
  };
}
