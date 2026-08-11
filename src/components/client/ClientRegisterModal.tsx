'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { OfertaGuestsModal } from './OfertaGuestsModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

interface ClientRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  restaurant: string;
  redirectUrl?: string;
}

export function ClientRegisterModal({ 
  isOpen, 
  onClose, 
  onSwitchToLogin,
  restaurant, 
  redirectUrl 
}: ClientRegisterModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOfertaModal, setShowOfertaModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('Необходимо принять условия оферты и политику конфиденциальности');
      return;
    }

    setLoading(true);

    try {
      // Регистрация
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ошибка регистрации');
        setLoading(false);
        return;
      }

      // Автоматический вход после регистрации
      const signInResult = await signIn('credentials', {
        email,
        password: phone,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Регистрация успешна, но не удалось войти');
        setLoading(false);
        return;
      }

      // Удаляем guest-id после успешной регистрации и входа
      const deviceUuid = localStorage.getItem('itresto-guest-id');
      if (deviceUuid) {
        try {
          const response = await fetch('/api/guest/link-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceUuid }),
          });
          
          localStorage.removeItem('itresto-guest-id');
          
          if (!response.ok) {
          }
        } catch (err) {
          console.error('Failed to link guest account:', err);
          localStorage.removeItem('itresto-guest-id');
        }
      }

      // Закрываем модалку и перезагружаем страницу для обновления сессии
      onClose();
      // Сохраняем текущий URL с query-параметрами (включая table)
      const currentUrl = window.location.pathname + window.location.search;
      router.push(currentUrl);
      router.refresh();
    } catch (err) {
      console.error('Registration error:', err);
      setError('Произошла ошибка при регистрации');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Overlay с прозрачностью 70% */}
      <div className="absolute inset-0 bg-[#000000] opacity-70" />

      {/* Модальное окно */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#ffffff] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия */}
        <button
          className="absolute right-4 top-4 z-10 text-[#4b5563] transition-colors hover:text-[#1f2937]"
          onClick={onClose}
          aria-label="Закрыть"
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

        {/* Содержимое */}
        <div className="p-6">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-[#111827]">Регистрация</h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              Создайте аккаунт для доступа к программе лояльности
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-[#fef2f2] p-3 text-sm text-[#991b1b]">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                Телефон *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
                placeholder="+7 (999) 123-45-67"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-[#6b7280]">
                Телефон будет использован для входа в систему
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              className="w-full"
            >
              Зарегистрироваться
            </Button>

            <div className="mt-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-[#6b7280]">
                  Я принимаю условия{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowOfertaModal(true);
                    }}
                    className="text-[#2563eb] underline hover:no-underline"
                  >
                    публичной оферты
                  </button>
                  {' '}и{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPrivacyModal(true);
                    }}
                    className="text-[#2563eb] underline hover:no-underline"
                  >
                    политики конфиденциальности
                  </button>
                </span>
              </label>
            </div>

            <p className="text-xs text-[#6b7280]">
              * Обязательные поля. Фамилия, имя, отчество и дата рождения
              можно будет указать позже в личном кабинете.
            </p>
          </form>

          <p className="mt-4 text-center text-sm text-[#6b7280]">
            Уже есть аккаунт?{' '}
            <button
              onClick={onSwitchToLogin}
              className="font-semibold text-[#2563eb] hover:underline"
            >
              Войти
            </button>
          </p>
        </div>
      </div>

      <OfertaGuestsModal
        isOpen={showOfertaModal}
        onClose={() => setShowOfertaModal(false)}
      />
      
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </div>
  );
}
