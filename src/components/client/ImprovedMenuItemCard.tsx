'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/lib/store/cartStore';
import { MenuItemModal } from './MenuItemModal';
import { ModifierInput } from '@/types';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations';
import { getOrCreateGuestId } from '@/lib/guestIdentity';

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  translations?: string | Record<string, { name: string; description?: string }> | null;
  price: string;
  imageUrl?: string | null;
  calories?: number | null;
  proteins?: number | null;
  fats?: number | null;
  carbohydrates?: number | null;
}

interface ImprovedMenuItemCardProps {
  item: MenuItem;
  discountPercent?: number;
  tableId?: string;
  defaultLocale?: string;
}

export function ImprovedMenuItemCard({ item, discountPercent = 0, tableId, defaultLocale = 'ru' }: ImprovedMenuItemCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [imgSrc, setImgSrc] = useState(item.imageUrl || '/images/dish.webp');
  const locale = useLocale();
  const { data: session } = useSession();
  
  const { addItem, decrementItem, items } = useCartStore();

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

  // Найти позицию в корзине (теперь всегда только одна позиция на menuItemId)
  const cartItem = items.find(i => i.menuItemId === item.id);
  const quantity = cartItem?.quantity || 0;

  const handleAddToCart = () => {
    // Для неавторизованных пользователей создаем guest-id при первом добавлении в корзину
    if (!session?.user) {
      getOrCreateGuestId();
    }
    
    // Добавляем блюдо с дефолтными модификаторами (все с quantity: 1)
    // TODO: здесь нужно получить реальные дефолтные модификаторы из БД
    // Пока добавляем без модификаторов
    addItem({
      menuItemId: item.id,
      name,
      basePrice: discountedPrice.toString(),
      imageUrl: item.imageUrl || undefined,
      modifiers: [], // В будущем здесь будут дефолтные модификаторы
    });
  };

  const handleDecrement = () => {
    decrementItem(item.id);
  };

  const handleAddToCartWithModifiers = (modifiers: ModifierInput[]) => {
    // Для неавторизованных пользователей создаем guest-id при первом добавлении в корзину
    if (!session?.user) {
      getOrCreateGuestId();
    }
    
    // Передаем базовую цену и модификаторы
    // cartStore сам рассчитает финальную цену
    addItem({
      menuItemId: item.id,
      name,
      basePrice: discountedPrice.toString(),
      imageUrl: item.imageUrl || undefined,
      modifiers,
    });
  };

  const handleImageError = () => {
    setImgSrc('/images/dish.webp');
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Не открывать модалку если клик по кнопкам
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <MenuItemModal
        key={item.id}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        item={item}
        discountedPrice={discountedPrice}
        originalPrice={originalPrice}
        discountPercent={discountPercent}
        onAddToCart={handleAddToCartWithModifiers}
        defaultLocale={defaultLocale}
      />
      
      <div 
        className="relative flex h-[235px] w-[calc(50%-7px)] max-w-[180px] cursor-pointer flex-col items-center rounded-3xl bg-[#ffffff] shadow-sm transition hover:shadow-md"
        onClick={handleCardClick}
      >
        {/* Изображение */}
        <div className="relative w-full">
          <Image
            src={imgSrc}
            alt={name}
            width={200}
            height={150}
            className="h-[150px] w-full rounded-3xl object-cover"
            loading="lazy"
            onError={handleImageError}
          />
          
          {/* Бейдж скидки */}
          {discountPercent > 0 && (
            <div className="absolute left-2 top-2 rounded-full bg-[#ef4444] px-2 py-1 text-xs font-bold text-[#ffffff]">
              -{discountPercent}%
            </div>
          )}
          
          {/* Кнопки добавления в корзину */}
          <div className="absolute bottom-2 left-1/2 w-[calc(100%-20px)] -translate-x-1/2 transform">
            <div className="relative flex h-12 items-center justify-end text-2xl">
              {/* Кнопки минус и счетчик - показываем только если quantity > 0 */}
              <div
                className={`absolute right-0 overflow-hidden transition-all duration-500 ease-in-out ${
                  quantity === 0 ? 'w-0 opacity-0' : 'w-full opacity-100'
                }`}
              >
                <div className="flex items-center rounded-full bg-[#f0f0f0] shadow-md">
                  <button
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[#111827] transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDecrement();
                    }}
                  >
                    <span className="-translate-y-0.5 transform">-</span>
                  </button>
                  <div className="min-w-[30px] flex-1 text-center text-xl text-[#111827]">{quantity}</div>
                  <div className="mr-10"></div>
                </div>
              </div>
              
              {/* Кнопка плюс - всегда видна */}
              <button
                className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[#111827] shadow-md transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart();
                }}
              >
                <span>+</span>
              </button>
            </div>
          </div>
        </div>

        {/* Информация о блюде */}
        <div className="my-2 w-[calc(100%-20px)]">
          <div className="mb-1 flex items-center gap-2">
            {discountPercent > 0 ? (
              <>
                <p className="text-md font-semibold text-[#111827]">{Math.round(discountedPrice)}₽</p>
                <p className="text-sm text-[#9ca3af] line-through">{Math.round(originalPrice)}₽</p>
              </>
            ) : (
              <p className="text-md font-semibold text-[#111827]">{Math.round(originalPrice)}₽</p>
            )}
          </div>
          <p className="line-clamp-2 w-full text-sm leading-tight text-[#1f2937]">{name}</p>
        </div>
      </div>
    </>
  );
}
