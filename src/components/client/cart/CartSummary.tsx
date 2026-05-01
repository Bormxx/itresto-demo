'use client';

import { useTranslations } from 'next-intl';
import { CartItem } from '@/types';

interface CartSummaryProps {
  items: CartItem[];
  totalPrice: number;
  getItemPrice: (item: CartItem) => number;
  tableNumber?: string;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
}

export function CartSummary({
  items,
  totalPrice,
  getItemPrice,
  tableNumber,
  onSubmit,
  onBack,
  loading,
}: CartSummaryProps) {
  const tCart = useTranslations('cart');

  return (
    <div className="space-y-4">
      {tableNumber && (
        <div className="rounded-lg bg-[#dbeafe] p-3 text-sm">
          <span className="font-semibold text-[#111827]">Столик:</span> {tableNumber}
        </div>
      )}

      {/* Сводка */}
      <div className="rounded-lg bg-[#f9fafb] p-4">
        <h4 className="mb-2 font-semibold text-[#111827]">Ваш заказ:</h4>
        <div className="space-y-1 text-sm text-[#111827]">
          {items.map((item) => (
            <div key={item.menuItemId} className="flex justify-between">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{getItemPrice(item).toFixed(2)} ₽</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between border-t pt-2 font-bold text-[#111827]">
          <span>{tCart('total')}</span>
          <span>{totalPrice.toFixed(2)} ₽</span>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={onSubmit}
          disabled={loading}
          className="w-full rounded-lg bg-[#16a34a] px-4 py-3 font-semibold text-[#ffffff] hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Отправка...' : 'Подтвердить заказ'}
        </button>
        <button
          onClick={onBack}
          disabled={loading}
          className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50"
        >
          Назад
        </button>
      </div>
    </div>
  );
}
