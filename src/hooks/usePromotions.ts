import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/lib/toast';

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
  createdAt: string;
  updatedAt: string;
  items?: { id: string; name: any }[];
  client?: { id: string; email: string; firstName: string; lastName: string; dateOfBirth?: string | null };
}

interface MenuItem {
  id: string;
  name: any;
  price: string;
}

interface Client {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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

export function usePromotions(restaurantId: string) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);

  const fetchPromotions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/supervisor/promotions?includeInactive=${includeInactive}&includeItems=true`);
      if (!response.ok) throw new Error('Failed to fetch promotions');
      const data = await response.json();
      setPromotions(data);
    } catch (error) {
      toast.error('Ошибка при загрузке', 'Не удалось загрузить акции');
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive]);

  const fetchInitialData = useCallback(async () => {
    try {
      // Загружаем блюда меню
      const menuRes = await fetch(`/api/supervisor/menu-items?restaurantId=${restaurantId}&type=main`);
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        setMenuItems(menuData);
      }
      
      // Загружаем список клиентов (сотрудников)
      const clientsRes = await fetch('/api/supervisor/staff');
      if (clientsRes.ok) {
        const staffData = await clientsRes.json();
        setClients(staffData);
      }
      
      // Загружаем промоакции
      await fetchPromotions();
    } catch (error) {
      setIsLoading(false);
    }
  }, [restaurantId, fetchPromotions]);

  const savePromotion = useCallback(async (formData: PromotionFormData, editingPromotion: Promotion | null) => {
    try {
      const url = '/api/supervisor/promotions';
      const method = editingPromotion ? 'PATCH' : 'POST';

      const payload: any = {
        type: formData.type,
        title: formData.title,
        description: formData.description || null,
        validFrom: formData.validFrom,
        validUntil: formData.isIndefinite ? null : formData.validUntil,
        isActive: formData.isActive,
        forAllClients: formData.forAllClients,
        clientId: formData.forAllClients ? null : (formData.clientId || null),
        timeFrom: formData.timeFrom || null,
        timeTo: formData.timeTo || null,
        eventType: formData.eventType || null,
        daysBeforeEvent: formData.daysBeforeEvent ? parseInt(formData.daysBeforeEvent) : null,
        daysAfterEvent: formData.daysAfterEvent ? parseInt(formData.daysAfterEvent) : null,
        birthdayPeriodDays: formData.birthdayPeriodDays ? parseInt(formData.birthdayPeriodDays) : null,
        rules: formData.rules || null,
        menuItemIds: formData.menuItemIds,
      };

      // Добавляем скидку только если указана
      if (formData.discountPercent) {
        payload.discountPercent = parseInt(formData.discountPercent);
        payload.discountAmount = null;
      } else if (formData.discountAmount) {
        payload.discountAmount = parseFloat(formData.discountAmount);
        payload.discountPercent = null;
      }

      if (editingPromotion) {
        payload.id = editingPromotion.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save promotion');
      }

      await fetchPromotions();
      toast.success(
        editingPromotion ? 'Акция обновлена' : 'Акция создана',
        `Акция "${formData.title}" успешно ${editingPromotion ? 'обновлена' : 'создана'}`
      );
      
      return { success: true };
    } catch (error: any) {
      toast.error('Ошибка при сохранении', error.message || 'Не удалось сохранить акцию');
      return { success: false, error: error.message || 'Failed to save promotion' };
    }
  }, [fetchPromotions]);

  const deletePromotion = useCallback(async (promotion: Promotion) => {
    try {
      const response = await fetch(`/api/supervisor/promotions?id=${promotion.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete promotion');
      }

      await fetchPromotions();
      toast.success('Акция удалена', `Акция "${promotion.title}" успешно удалена`);
      
      return { success: true };
    } catch (error: any) {
      toast.error('Ошибка при удалении', error.message || 'Не удалось удалить акцию');
      return { success: false, error: error.message || 'Failed to delete promotion' };
    }
  }, [fetchPromotions]);

  const toggleActive = useCallback(async (promotion: Promotion) => {
    try {
      const response = await fetch('/api/supervisor/promotions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: promotion.id,
          isActive: !promotion.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update promotion');
      }

      await fetchPromotions();
      toast.success(
        `Акция ${!promotion.isActive ? 'активирована' : 'деактивирована'}`,
        `Акция "${promotion.title}" успешно ${!promotion.isActive ? 'активирована' : 'деактивирована'}`
      );
      
      return { success: true };
    } catch (error: any) {
      toast.error('Ошибка при обновлении', error.message || 'Не удалось изменить статус акции');
      return { success: false, error: error.message || 'Failed to update promotion' };
    }
  }, [fetchPromotions]);

  // Auto-fetch promotions when includeInactive changes
  useEffect(() => {
    if (restaurantId) {
      fetchPromotions();
    }
  }, [includeInactive, restaurantId, fetchPromotions]);

  return {
    // State
    promotions,
    isLoading,
    restaurantId,
    menuItems,
    clients,
    includeInactive,
    setIncludeInactive,
    
    // Actions
    fetchInitialData,
    fetchPromotions,
    savePromotion,
    deletePromotion,
    toggleActive,
  };
}
