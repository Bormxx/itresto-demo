'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations';
import { ModifierInput, CartItemModifier } from '@/types';

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  imageUrl?: string | null;
  calories?: number | null;
  proteins?: number | null;
  fats?: number | null;
  carbohydrates?: number | null;
  translations?: any;
}

interface Modifier {
  id: string;
  modifierGroupId: string;
  menuItemId: string;
  priceModifier: string;
  isDefault: boolean;
  sortOrder: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  calories?: number | null;
  proteins?: number | null;
  fats?: number | null;
  carbohydrates?: number | null;
}

interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  minSelections: number | null;
  maxSelections: number | null;
  sortOrder: number;
  modifiers: Modifier[];
}

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem;
  discountedPrice: number;
  originalPrice: number;
  discountPercent: number;
  onAddToCart: (modifiers: CartItemModifier[]) => void;
  initialModifiers?: CartItemModifier[];
  defaultLocale?: string;
}

export function MenuItemModal({
  isOpen,
  onClose,
  item,
  discountedPrice,
  originalPrice,
  discountPercent,
  onAddToCart,
  initialModifiers,
  defaultLocale = 'ru',
}: MenuItemModalProps) {
  const [imgSrc, setImgSrc] = useState(item.imageUrl || '/images/dish.webp');
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedModifiers, setSelectedModifiers] = useState<Map<string, number>>(new Map());
  const t = useTranslations('menu');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  // Get translated content
  const translatedName = getTranslatedName(
    item.translations,
    locale,
    defaultLocale,
    item.name
  );
  const translatedDescription = getTranslatedDescription(
    item.translations,
    locale,
    defaultLocale,
    item.description || undefined
  );

  // Update image when item changes
  useEffect(() => {
    setImgSrc(item.imageUrl || '/images/dish.webp');
  }, [item.imageUrl]);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && item.id) {
      fetchModifiers();
    }
  }, [isOpen, item.id]);

  const fetchModifiers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/menu-items/${item.id}/modifiers`);
      if (response.ok) {
        const data = await response.json();
        setModifierGroups(data);
        
        // Если переданы начальные модификаторы - используем их
        if (initialModifiers && initialModifiers.length > 0) {
          const initMap = new Map<string, number>();
          
          // Находим соответствующие модификаторы по ID
          data.forEach((group: ModifierGroup) => {
            group.modifiers.forEach((mod) => {
              const initial = initialModifiers.find(
                (im) => im.modifierId === mod.id.toString() || im.modifierId === mod.id
              );
              if (initial) {
                initMap.set(mod.id, initial.quantity);
              }
            });
          });
          
          setSelectedModifiers(initMap);
        } else {
          // Иначе устанавливаем количество по умолчанию для всех isDefault модификаторов
          const defaults = new Map<string, number>();
          data.forEach((group: ModifierGroup) => {
            group.modifiers.forEach((mod) => {
              if (mod.isDefault) {
                defaults.set(mod.id, 1);
              }
            });
          });
          setSelectedModifiers(defaults);
        }
      }
    } catch (error) {
      console.error('Error fetching modifiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModifierQuantityChange = (modifierId: number, delta: number) => {
    setSelectedModifiers((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(modifierId) || 0;
      const newQuantity = Math.max(0, current + delta);
      
      // Всегда храним количество в Map, даже если оно 0
      // Это важно для правильного расчета цены (удаление дефолтных модификаторов)
      newMap.set(modifierId, newQuantity);
      
      return newMap;
    });
  };

  const getTotalPrice = () => {
    let total = discountedPrice;
    
    // Получаем все модификаторы
    const allModifiers = modifierGroups.flatMap((g) => g.modifiers);
    
    allModifiers.forEach((modifier) => {
      const quantity = selectedModifiers.get(modifier.id) || 0;
      const price = parseFloat(modifier.priceModifier);
      
      if (modifier.isDefault) {
        // Дефолтный модификатор уже включен в базовую цену
        if (quantity === 0) {
          // Убран - вычитаем
          total -= price;
        } else if (quantity > 1) {
          // Добавлено больше 1 - добавляем extra
          total += price * (quantity - 1);
        }
        // quantity === 1 - ничего не меняем
      } else {
        // Недефолтный - просто добавляем
        total += price * quantity;
      }
    });
    
    return total;
  };

  const getTotalNutrition = () => {
    const nutrition = {
      calories: item.calories || 0,
      proteins: item.proteins || 0,
      fats: item.fats || 0,
      carbohydrates: item.carbohydrates || 0,
    };
    
    // Получаем все модификаторы
    const allModifiers = modifierGroups.flatMap((g) => g.modifiers);
    
    allModifiers.forEach((modifier) => {
      const quantity = selectedModifiers.get(modifier.id) || 0;
      
      if (modifier.isDefault) {
        // Дефолтный модификатор уже включен в базовые КБЖУ
        if (quantity === 0) {
          // Убран - вычитаем
          nutrition.calories -= modifier.calories || 0;
          nutrition.proteins -= modifier.proteins || 0;
          nutrition.fats -= modifier.fats || 0;
          nutrition.carbohydrates -= modifier.carbohydrates || 0;
        } else if (quantity > 1) {
          // Добавлено больше 1 - добавляем extra
          nutrition.calories += (modifier.calories || 0) * (quantity - 1);
          nutrition.proteins += (modifier.proteins || 0) * (quantity - 1);
          nutrition.fats += (modifier.fats || 0) * (quantity - 1);
          nutrition.carbohydrates += (modifier.carbohydrates || 0) * (quantity - 1);
        }
        // quantity === 1 - ничего не меняем
      } else {
        // Недефолтный - просто добавляем
        nutrition.calories += (modifier.calories || 0) * quantity;
        nutrition.proteins += (modifier.proteins || 0) * quantity;
        nutrition.fats += (modifier.fats || 0) * quantity;
        nutrition.carbohydrates += (modifier.carbohydrates || 0) * quantity;
      }
    });
    
    return nutrition;
  };

  const handleAddToCart = () => {
    const modifiers: ModifierInput[] = [];
    
    // Проходим по ВСЕМ модификаторам, не только по выбранным
    const allModifiers = modifierGroups.flatMap((g) => g.modifiers);
    
    allModifiers.forEach((modifier) => {
      const quantity = selectedModifiers.get(modifier.id) ?? (modifier.isDefault ? 1 : 0);
      
      // Добавляем модификатор, даже если quantity = 0 (для корректного расчета цены)
      modifiers.push({
        modifierId: modifier.id,
        quantity,
        priceModifier: parseFloat(modifier.priceModifier),
        name: modifier.name,
        isDefault: modifier.isDefault,
      });
    });
    
    onAddToCart(modifiers);
    onClose();
  };

  const canAddToCart = () => {
    // Все группы опциональные - можно добавить в любой момент
    return true;
  };

  if (!isOpen) return null;

  const handleImageError = () => {
    setImgSrc('/images/dish.webp');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      {/* Overlay с прозрачностью 70% */}
      <div
        className="fixed inset-0 bg-[#000000] opacity-70 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Модальное окно */}
      <div
        className="relative my-8 w-full max-w-md rounded-3xl bg-[#ffffff] shadow-xl transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия - иконка крестика */}
        <button
          className="absolute right-4 top-4 z-10 text-[#4b5563] transition-colors hover:text-[#1f2937]"
          onClick={onClose}
          aria-label={tCommon('close')}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Содержимое модалки */}
        <div className="flex flex-col justify-center p-6">
          {/* Изображение */}
          <div className="relative">
            <img
              src={imgSrc}
              alt={translatedName}
              className="h-auto max-w-full rounded-lg"
              loading="lazy"
              onError={handleImageError}
            />
            {discountPercent > 0 && (
              <div className="absolute left-4 top-4 rounded-full bg-[#ef4444] px-3 py-1 text-sm font-bold text-[#ffffff]">
                -{discountPercent}%
              </div>
            )}
          </div>

          {/* Описание */}
          {translatedDescription && (
            <p className="my-3 text-center text-[#6b7280]">{translatedDescription}</p>
          )}

          {/* Модификаторы */}
          {loading ? (
            <div className="py-4 text-center text-[#9ca3af]">{tCommon('loading')}...</div>
          ) : modifierGroups.filter(group => group.modifiers && group.modifiers.length > 0).length > 0 ? (
            <div className="my-4 space-y-4">
              {modifierGroups.filter(group => group.modifiers && group.modifiers.length > 0).map((group) => (
                <div key={group.id} className="rounded-lg border border-[#e5e7eb] p-3">
                  <div className="mb-2">
                    <h3 className="font-semibold text-[#111827]">{group.name}</h3>
                  </div>

                  <div className="space-y-2">
                    {group.modifiers.map((modifier) => {
                      const quantity = selectedModifiers.get(modifier.id) || 0;
                      const priceModifier = parseFloat(modifier.priceModifier);
                      
                      return (
                        <div
                          key={modifier.id}
                          className="flex items-center justify-between rounded-lg bg-[#f9fafb] p-2"
                        >
                          <div className="flex-1">
                            <p className="text-sm text-[#111827]">{modifier.name}</p>
                            {priceModifier !== 0 && (
                              <p className="text-xs text-[#6b7280]">
                                {Math.round(priceModifier)}₽
                                {modifier.isDefault && <span className="text-[#16a34a] ml-1">({t('byDefault')})</span>}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ffffff] text-[#111827] transition-colors hover:bg-[#e5e7eb] disabled:opacity-50"
                              onClick={() => handleModifierQuantityChange(modifier.id, -1)}
                              disabled={quantity === 0}
                            >
                              <span className="text-lg">-</span>
                            </button>
                            <span className="min-w-[20px] text-center text-sm text-[#111827]">
                              {quantity}
                            </span>
                            <button
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563eb] text-[#ffffff] transition-colors hover:bg-[#1d4ed8]"
                              onClick={() => handleModifierQuantityChange(modifier.id, 1)}
                            >
                              <span className="text-lg">+</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Пищевая ценность */}
          {(item.calories || item.proteins || item.fats || item.carbohydrates) && (
            <div className="mb-4 rounded-lg bg-[#f9fafb] p-3">
              <p className="mb-2 text-sm font-semibold text-[#111827]">
                {t('nutrition')}:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(() => {
                  const totalNutrition = getTotalNutrition();
                  return (
                    <>
                      {(item.calories !== null && item.calories !== undefined) && (
                        <div className="flex justify-between">
                          <span className="text-[#6b7280]">{t('calories')}</span>
                          <span className="text-[#111827]">
                            {Math.round(totalNutrition.calories)} {t('kcal')}
                          </span>
                        </div>
                      )}
                      {(item.proteins !== null && item.proteins !== undefined) && (
                        <div className="flex justify-between">
                          <span className="text-[#6b7280]">{t('proteins')}</span>
                          <span className="text-[#111827]">
                            {Math.round(totalNutrition.proteins * 10) / 10} {t('g')}
                          </span>
                        </div>
                      )}
                      {(item.fats !== null && item.fats !== undefined) && (
                        <div className="flex justify-between">
                          <span className="text-[#6b7280]">{t('fats')}</span>
                          <span className="text-[#111827]">
                            {Math.round(totalNutrition.fats * 10) / 10} {t('g')}
                          </span>
                        </div>
                      )}
                      {(item.carbohydrates !== null && item.carbohydrates !== undefined) && (
                        <div className="flex justify-between">
                          <span className="text-[#6b7280]">{t('carbohydrates')}</span>
                          <span className="text-[#111827]">
                            {Math.round(totalNutrition.carbohydrates * 10) / 10} {t('g')}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Итоговая цена и кнопка добавления */}
          <div className="sticky bottom-0 bg-[#ffffff] pt-4">
            <button
              className="w-full rounded-full bg-[#2563eb] py-3 font-semibold text-[#ffffff] transition-colors hover:bg-[#1d4ed8]"
              onClick={handleAddToCart}
            >
              {t('addToCart')} • {Math.round(getTotalPrice())}₽
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
