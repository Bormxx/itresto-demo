'use client';

import { useState, useEffect } from 'react';
import { MenuItemModal } from './MenuItemModal';
import { CartItemModifier, ModifierInput } from '@/types';
import { Button } from '@/components/ui';

interface EditMenuItemModalProps {
  menuItemId: string;
  name: string;
  imageUrl?: string;
  initialModifiers?: CartItemModifier[];
  onClose: () => void;
  onSave: (modifiers: ModifierInput[]) => void;
}

export function EditMenuItemModal({
  menuItemId,
  name,
  imageUrl,
  initialModifiers,
  onClose,
  onSave,
}: EditMenuItemModalProps) {
  const [loading, setLoading] = useState(true);
  const [basePrice, setBasePrice] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenuItem = async () => {
      try {
        const response = await fetch(`/api/menu-items/${menuItemId}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error('Failed to fetch menu item');
        }
        
        setBasePrice(parseFloat(data.menuItem.price));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching menu item:', err);
        setError('Не удалось загрузить данные блюда');
        setLoading(false);
      }
    };

    fetchMenuItem();
  }, [menuItemId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-white p-6">
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="rounded-lg bg-white p-6">
          <p className="text-red-600">{error}</p>
          <Button
            onClick={onClose}
            variant="secondary"
            className="mt-4"
          >
            Закрыть
          </Button>
        </div>
      </div>
    );
  }

  return (
    <MenuItemModal
      isOpen={true}
      onClose={onClose}
      item={{
        id: menuItemId,
        name,
        price: basePrice.toString(),
        imageUrl,
      }}
      discountedPrice={basePrice}
      originalPrice={basePrice}
      discountPercent={0}
      onAddToCart={onSave}
      initialModifiers={initialModifiers}
    />
  );
}
