'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderTotal: number;
  onSuccess: () => void;
  myOrdersTotal?: number; // Сумма заказов текущего клиента
  isSharedBill?: boolean; // Совместный ли счёт
  tableNumber?: string; // Номер стола
}

export function CheckoutModal({ 
  isOpen, 
  onClose, 
  orderId, 
  orderTotal, 
  onSuccess,
  myOrdersTotal = 0,
  isSharedBill = false,
  tableNumber
}: CheckoutModalProps) {
  const [tipPercent, setTipPercent] = useState(10);
  const [customTip, setCustomTip] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTipSelect = (percent: number) => {
    setTipPercent(percent);
    setCustomTip('');
  };

  const handleCustomTipChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setCustomTip(value);
      setTipPercent(num);
    } else {
      setCustomTip(value);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderId, 
          tipPercent,
          isSharedBill,
          tableNumber 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании платежа');
      }

      // Редирект на страницу оплаты платёжной системы (CloudPayments/Stripe)
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      } else {
        throw new Error('Не получена ссылка для оплаты');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tipAmount = (orderTotal * tipPercent) / 100;
  const totalAmount = orderTotal + tipAmount;
  const othersTotal = orderTotal - myOrdersTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#ffffff] p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#111827]">Оплата</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-[#9ca3af] transition hover:text-[#4b5563] disabled:opacity-50"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Заголовок для совместного счёта */}
          {isSharedBill && tableNumber && (
            <div className="rounded-lg bg-[#eff6ff] p-3 text-center">
              <p className="text-sm font-semibold text-[#1e3a8a]">
                Совместный счёт — Стол №{tableNumber}
              </p>
              <p className="mt-1 text-xs text-[#1d4ed8]">
                Вы оплачиваете весь счёт стола
              </p>
            </div>
          )}

          {/* Разбивка суммы для совместного счёта */}
          {isSharedBill && myOrdersTotal > 0 && (
            <div className="space-y-2 rounded-lg border border-[#e5e7eb] p-4">
              <div className="flex justify-between text-sm">
                <span className="text-[#4b5563]">Ваши заказы:</span>
                <span className="font-semibold text-[#111827]">{myOrdersTotal.toFixed(2)} ₽</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#4b5563]">Заказы компании:</span>
                <span className="font-semibold text-[#111827]">{othersTotal.toFixed(2)} ₽</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-[#111827]">Сумма заказа:</span>
                  <span className="font-bold text-[#111827]">{orderTotal.toFixed(2)} ₽</span>
                </div>
              </div>
            </div>
          )}

          {/* Сумма заказа (для обычного счёта) */}
          {!isSharedBill && (
            <div className="text-center">
              <p className="text-sm text-[#4b5563]">Сумма заказа</p>
              <p className="text-3xl font-bold text-[#111827]">{orderTotal.toFixed(2)} ₽</p>
            </div>
          )}

          {/* Выбор чаевых */}
          <div>
            <p className="mb-3 text-sm font-medium text-[#374151]">
              Оставить чаевые официанту?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 10, 15, 20].map((percent) => (
                <button
                  key={percent}
                  type="button"
                  onClick={() => handleTipSelect(percent)}
                  disabled={loading}
                  className={`rounded-lg border-2 py-3 font-semibold transition disabled:opacity-50 ${
                    tipPercent === percent && !customTip
                      ? 'border-[#16a34a] bg-[#f0fdf4] text-[#15803d]'
                      : 'border-[#e5e7eb] text-[#374151] hover:border-[#d1d5db]'
                  }`}
                >
                  {percent}%
                </button>
              ))}
            </div>
          </div>

          {/* Свой процент */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#374151]">
              Или укажите свой процент
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={customTip}
                onChange={(e) => handleCustomTipChange(e.target.value)}
                disabled={loading}
                placeholder="0"
                className="w-full rounded-lg border border-[#d1d5db] bg-[#ffffff] px-4 py-3 pr-10 text-[#111827] placeholder:text-[#9ca3af] focus:border-[#22c55e] focus:outline-none focus:ring-2 focus:ring-[#bbf7d0] disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7280]">%</span>
            </div>
          </div>

          {/* Итого с чаевыми */}
          {tipPercent > 0 && (
            <div className="rounded-lg bg-[#f0fdf4] p-4 text-center">
              <p className="text-sm text-[#15803d]">Итого к оплате</p>
              <p className="text-2xl font-bold text-[#14532d]">
                {totalAmount.toFixed(2)} ₽
              </p>
              <p className="mt-1 text-xs text-[#16a34a]">
                включая {tipAmount.toFixed(2)} ₽ чаевых
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-[#fef2f2] p-3 text-sm text-[#991b1b]">
              {error}
            </div>
          )}

          {/* Информация */}
          <div className="rounded-lg bg-[#eff6ff] p-3 text-xs text-[#1e40af]">
            <p className="font-semibold">💳 Способы оплаты:</p>
            <p className="mt-1">Visa, MasterCard, Мир, СБП, GooglePay, ApplePay</p>
          </div>

          {/* Кнопка оплаты */}
          <Button
            onClick={handlePayment}
            variant="success"
            isLoading={loading}
            loadingText="Переход к оплате..."
            className="w-full"
          >
            Оплатить {totalAmount.toFixed(2)} ₽
          </Button>
        </div>
      </div>
    </div>
  );
}
