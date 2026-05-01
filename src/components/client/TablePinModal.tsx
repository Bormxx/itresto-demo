'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import { getOrCreateGuestId } from '@/lib/guestIdentity';

interface TablePinModalProps {
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function TablePinModal({ 
  restaurantId, 
  tableId, 
  tableNumber,
  onSuccess,
  onCancel 
}: TablePinModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    // Фокус на первом поле при открытии
    inputRefs.current[0]?.focus();
  }, []);

  // Block body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Только цифры

    const newPin = [...pin];
    newPin[index] = value.slice(-1); // Только последняя цифра
    setPin(newPin);
    setError('');

    // Автоматический переход к следующему полю
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Автоматическая отправка при заполнении всех 4 цифр
    if (index === 3 && value) {
      const fullPin = [...newPin.slice(0, 3), value].join('');
      verifyPin(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      // Переход к предыдущему полю при удалении
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    if (/^\d{4}$/.test(pastedData)) {
      const newPin = pastedData.split('');
      setPin(newPin);
      inputRefs.current[3]?.focus();
      verifyPin(pastedData);
    }
  };

  const verifyPin = async (pinValue: string) => {
    if (pinValue.length !== 4) return;

    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch(`/api/tables/${tableId}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      });

      const data = await response.json();

      if (data.success) {
        // Сохраняем в localStorage, что доступ разрешён, и сам PIN
        localStorage.setItem(`itresto-table-access-${tableId}`, 'granted');
        localStorage.setItem(`itresto-table-pin-${tableId}`, pinValue);
        
        // Для неавторизованных пользователей создаем guest-id
        if (!session?.user) {
          getOrCreateGuestId();
        }
        
        // Отправляем кастомное событие для обновления компонентов
        window.dispatchEvent(new Event('pinUpdated'));
        
        onSuccess();
      } else {
        setError(data.error || 'Неверный PIN-код');
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('Ошибка при проверке PIN');
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = () => {
    const pinValue = pin.join('');
    if (pinValue.length === 4) {
      verifyPin(pinValue);
    } else {
      setError('Введите все 4 цифры');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/50 backdrop-blur-sm">
      <div className="bg-[#ffffff] rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#dbeafe] rounded-full mb-4">
            <svg
              className="w-8 h-8 text-[#2563eb]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#111827] mb-2">
            Столик занят
          </h2>
          <p className="text-[#4b5563]">
            Столик <span className="font-semibold">{tableNumber}</span> уже занят.
            <br />
            Попросите PIN-код у гостей за столиком
          </p>
        </div>

        {/* PIN поля */}
        <div className="flex justify-center gap-3 mb-6">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={isVerifying}
              className={`w-16 h-16 text-center text-2xl font-bold border-2 rounded-xl transition-all ${
                digit
                  ? 'border-[#2563eb] bg-[#eff6ff] text-[#1e3a8a]'
                  : 'border-[#d1d5db] bg-[#ffffff] text-[#111827]'
              } ${
                isVerifying ? 'opacity-50 cursor-not-allowed' : ''
              } focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/20 focus:border-[#2563eb]`}
            />
          ))}
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Кнопки */}
        <div className="space-y-3">
          <Button
            onClick={handleSubmit}
            disabled={pin.join('').length !== 4 || isVerifying}
            variant="primary"
            isLoading={isVerifying}
            loadingText="Проверка..."
            className="w-full"
          >
            Подтвердить
          </Button>

          {onCancel && (
            <Button
              onClick={onCancel}
              disabled={isVerifying}
              variant="secondary"
              className="w-full"
            >
              Выбрать другой столик
            </Button>
          )}
        </div>

        {/* Подсказка */}
        <p className="text-center text-sm text-[#6b7280] mt-6">
          Если вы первый гость, PIN отобразится после создания заказа
        </p>
      </div>
    </div>
  );
}
