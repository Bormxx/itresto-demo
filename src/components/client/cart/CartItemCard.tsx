'use client';

import { useTranslations } from 'next-intl';
import { CartItem, CartItemModifier } from '@/types';

interface CartItemCardProps {
  item: CartItem;
  index: number;
  totalPrice: number;
  onIncrement: (menuItemId: string) => void;
  onDecrement: (menuItemId: string) => void;
  onRemove: (menuItemId: string) => void;
  onEdit: (index: number) => void;
  onUpdateModifier: (menuItemId: string, modifierId: string, type: 'added' | 'removed', delta: number) => void;
}

export function CartItemCard({
  item,
  index,
  totalPrice,
  onIncrement,
  onDecrement,
  onRemove,
  onEdit,
  onUpdateModifier,
}: CartItemCardProps) {
  const tCart = useTranslations('cart');

  return (
    <div className="flex gap-4 rounded-lg border p-3">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-30 w-30 cursor-pointer rounded object-cover transition-opacity hover:opacity-80"
          onClick={() => onEdit(index)}
          title={tCart('clickToEdit')}
        />
      )}
      <div className="flex-1">
        <h3 className="font-semibold text-[#111827]">{item.name}</h3>
        <p className="font-semibold text-[#111827]">
          {totalPrice.toFixed(0)} ₽
        </p>

        {/* Модификаторы */}
        {item.modifiers && item.modifiers.length > 0 && (
          <div className="mt-2 space-y-1">
            {item.modifiers.map((mod: CartItemModifier) => {
              if (mod.isDefault) {
                // Дефолтный модификатор: количество = 1 (базовая) + добавленные - убранные
                const removedCount = mod.removedCount || 0;
                const addedCount = mod.addedCount || 0;
                const totalQuantity = Math.max(0, 1 + addedCount - removedCount);
                
                return (
                  <div key={mod.modifierId} className="mb-2 flex items-center gap-2 text-xs">
                    <span className="text-[#6b7280]">
                      {mod.name} {mod.priceModifier && mod.priceModifier > 0 ? `(+${mod.priceModifier}₽)` : ''}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (totalQuantity > 1) {
                            // Есть дополнительные порции - убираем их
                            onUpdateModifier(item.menuItemId, mod.modifierId, 'added', -1);
                          } else if (totalQuantity === 1) {
                            // Стандартное количество - убираем модификатор
                            onUpdateModifier(item.menuItemId, mod.modifierId, 'removed', 1);
                          }
                          // При totalQuantity === 0 кнопка "-" не активна (можно добавить disabled)
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded bg-[#e5e7eb] text-[#374151] hover:bg-[#d1d5db] disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={totalQuantity === 0}
                        title={totalQuantity > 1 ? "Убрать 1 порцию" : totalQuantity === 1 ? "Убрать модификатор" : "Минимум 0"}
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-[#111827]">{totalQuantity}</span>
                      <button
                        onClick={() => {
                          if (totalQuantity === 0) {
                            // Возвращаем модификатор (убираем removedCount)
                            onUpdateModifier(item.menuItemId, mod.modifierId, 'removed', -1);
                          } else {
                            // Добавляем дополнительную порцию
                            onUpdateModifier(item.menuItemId, mod.modifierId, 'added', 1);
                          }
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded bg-[#e5e7eb] text-[#374151] hover:bg-[#d1d5db]"
                        title={totalQuantity === 0 ? "Вернуть модификатор" : "Добавить порцию"}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              } else {
                // Недефолтный: показываем только если добавлен
                if (mod.addedCount && mod.addedCount > 0) {
                  return (
                    <div key={mod.modifierId} className="mb-2 flex items-center gap-2 text-xs">
                      <span className="text-[#6b7280]">
                        + {mod.name} {mod.priceModifier && mod.priceModifier > 0 ? `(+${mod.priceModifier}₽)` : ''}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          onClick={() => onUpdateModifier(item.menuItemId, mod.modifierId, 'added', -1)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-[#e5e7eb] text-[#374151] hover:bg-[#d1d5db]"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-[#111827]">{mod.addedCount}</span>
                        <button
                          onClick={() => onUpdateModifier(item.menuItemId, mod.modifierId, 'added', 1)}
                          className="flex h-6 w-6 items-center justify-center rounded bg-[#e5e7eb] text-[#374151] hover:bg-[#d1d5db]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              }
            })}
          </div>
        )}

        {/* Количество */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => onDecrement(item.menuItemId)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e5e7eb] text-[#374151] hover:bg-[#d1d5db]"
          >
            −
          </button>
          <span className="w-8 text-center font-semibold text-[#111827]">{item.quantity}</span>
          <button
            onClick={() => onIncrement(item.menuItemId)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb] text-[#ffffff] hover:bg-[#1d4ed8]"
          >
            +
          </button>
          <button
            onClick={() => onRemove(item.menuItemId)}
            className="ml-auto text-sm text-[#dc2626] hover:underline"
          >
            {tCart('remove')}
          </button>
        </div>
      </div>
    </div>
  );
}
