'use client';

import { useEffect } from 'react';
import { BillType } from '@/lib/store/cartStore';

interface BillTypeDialogProps {
  isOpen: boolean;
  onSelect: (billType: BillType) => void;
}

export function BillTypeDialog({ isOpen, onSelect }: BillTypeDialogProps) {
  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-[#ffffff] p-6 shadow-xl">
        <h2 className="mb-4 text-2xl font-bold text-[#111827]">
          Выберите тип счёта
        </h2>
        
        <p className="mb-6 text-sm text-[#4b5563]">
          Если вы делите стол с другими гостями, выберите подходящий вариант оплаты
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onSelect('shared')}
            className="w-full rounded-lg border-2 border-[#bfdbfe] bg-[#eff6ff] p-4 text-left transition hover:border-[#60a5fa] hover:bg-[#dbeafe]"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">👥</span>
              <div className="flex-1">
                <h3 className="font-semibold text-[#1e3a8a]">Совместный счёт</h3>
                <p className="mt-1 text-sm text-[#1d4ed8]">
                  Все заказы за столом будут объединены в один счёт. Подходит для компаний.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect('separate')}
            className="w-full rounded-lg border-2 border-[#bbf7d0] bg-[#f0fdf4] p-4 text-left transition hover:border-[#4ade80] hover:bg-[#dcfce7]"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">👤</span>
              <div className="flex-1">
                <h3 className="font-semibold text-[#14532d]">Раздельный счёт</h3>
                <p className="mt-1 text-sm text-[#15803d]">
                  Каждый гость оплачивает только свои заказы. Подходит для индивидуальной оплаты.
                </p>
              </div>
            </div>
          </button>
        </div>

        <p className="mt-4 text-xs text-[#6b7280]">
          * Вы можете изменить тип счёта в любой момент, очистив корзину
        </p>
      </div>
    </div>
  );
}
