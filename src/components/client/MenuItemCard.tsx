'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/lib/store/cartStore';
import { useLocale } from 'next-intl';
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations';
import { Button } from '@/components/ui';
import { getOrCreateGuestId } from '@/lib/guestIdentity';

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  translations?: string | Record<string, { name: string; description?: string }>;
  price: string;
  imageUrl?: string | null;
}

interface MenuItemCardProps {
  item: MenuItem;
  discountPercent?: number;
  tableId?: string;
  defaultLocale?: string;
}

export function MenuItemCard({ item, discountPercent = 0, tableId, defaultLocale = 'ru' }: MenuItemCardProps) {
  const { addItem, setBillType } = useCartStore();
  const locale = useLocale();
  const { data: session } = useSession();

  // Get translated content
  const name = getTranslatedName(
    item.translations,
    locale,
    defaultLocale,
    item.name
  );
  const description = getTranslatedDescription(
    item.translations,
    locale,
    defaultLocale,
    item.description || undefined
  );

  const originalPrice = Number(item.price);
  const discountedPrice = discountPercent > 0 
    ? originalPrice * (1 - discountPercent / 100)
    : originalPrice;

  const handleAddToCart = () => {
    // Для неавторизованных пользователей создаем guest-id при первом добавлении в корзину
    if (!session?.user) {
      getOrCreateGuestId();
    }
    
    addItem({
      menuItemId: item.id,
      name,
      basePrice: discountedPrice.toString(),
      imageUrl: item.imageUrl || undefined,
    });
  };

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-[#e5e7eb] transition hover:shadow-md">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={name}
          className="h-48 w-full object-cover"
        />
      )}
      <div className="p-4">
        <h4 className="mb-2 font-semibold text-[#111827]">{name}</h4>
        {description && (
          <p className="mb-3 text-sm text-[#4b5563]">{description}</p>
        )}
        <div className="flex items-center justify-between">
          <div>
            {discountPercent > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-[#2563eb]">
                  {discountedPrice.toFixed(2)} ₽
                </span>
                <span className="text-sm text-[#9ca3af] line-through">
                  {originalPrice.toFixed(2)} ₽
                </span>
                <span className="rounded bg-[#dcfce7] px-2 py-0.5 text-xs font-medium text-[#166534]">
                  -{discountPercent}%
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold text-[#2563eb]">
                {originalPrice.toFixed(2)} ₽
              </span>
            )}
          </div>
          <Button
            onClick={handleAddToCart}
            variant="primary"
            size="sm"
          >
            Добавить
          </Button>
        </div>
      </div>
      </div>
    </>
  );
}
