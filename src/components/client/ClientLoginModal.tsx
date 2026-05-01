'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

interface ClientLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
  restaurant: string;
  redirectUrl?: string;
}

export function ClientLoginModal({ isOpen, onClose, onSwitchToRegister, restaurant, redirectUrl }: ClientLoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password: password,
        redirect: false,
      });

      if (result?.error) {
        setError('Неверный email или пароль');
        setLoading(false);
        return;
      }

      // Удаляем guest-id после успешной авторизации
      const deviceUuid = localStorage.getItem('itresto-guest-id');
      if (deviceUuid) {
        try {
          const response = await fetch('/api/guest/link-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceUuid }),
          });
          
          // Удаляем guest-id в любом случае
          localStorage.removeItem('itresto-guest-id');
          
          if (!response.ok) {
          }
        } catch (err) {
          console.error('Failed to link guest account:', err);
          // Удаляем guest-id даже при ошибке
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
      console.error('Login error:', err);
      setError('Произошла ошибка при входе');
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
            <h2 className="text-2xl font-bold text-[#111827]">Вход</h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              Войдите для доступа к программе лояльности
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
                Email
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
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#3b82f6] focus:outline-none"
                placeholder="Введите пароль"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              className="w-full"
            >
              Войти
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[#6b7280]">
            Нет аккаунта?{' '}
            <button
              onClick={onSwitchToRegister}
              className="font-semibold text-[#2563eb] hover:underline"
            >
              Зарегистрироваться
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
