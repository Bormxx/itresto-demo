'use client';

import { useTranslations } from 'next-intl';
import { ActiveOrders } from '../ActiveOrders';

interface EmptyCartViewProps {
  tableId?: string;
  tableNumber: string;
  refreshKey: number;
  hasActiveOrders: boolean;
  currentBillType: 'shared' | 'separate' | null;
  onOrdersLoaded: (hasOrders: boolean, myTotal: number, allTotal: number, pendingCount: number) => void;
  onPayBill: () => void;
}

export function EmptyCartView({
  tableId,
  tableNumber,
  refreshKey,
  hasActiveOrders,
  currentBillType,
  onOrdersLoaded,
  onPayBill,
}: EmptyCartViewProps) {
  const tCart = useTranslations('cart');

  return (
    <div className="space-y-4">
      {/* Активные заказы */}
      <ActiveOrders
        tableId={tableId}
        tableNumber={tableNumber}
        refreshKey={refreshKey}
        onOrdersLoaded={onOrdersLoaded}
        currentBillType={currentBillType}
      />

      {/* Кнопка оплаты для активных заказов или сообщение о пустой корзине */}
      {hasActiveOrders ? (
        <button
          onClick={onPayBill}
          className="w-full rounded-lg bg-[#16a34a] px-4 py-3 font-semibold text-[#ffffff] hover:bg-[#15803d]"
        >
          💳 {tCart('payBill')}
        </button>
      ) : (
        <div className="py-8 text-center text-[#6b7280]">
          {tCart('empty')}
        </div>
      )}
    </div>
  );
}
