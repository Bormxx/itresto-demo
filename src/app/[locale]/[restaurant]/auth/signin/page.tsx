'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Неверный email или пароль');
        setLoading(false);
      } else {
        // Если авторизация успешна, связываем гостевой аккаунт с реальным
        const deviceUuid = typeof window !== 'undefined' 
          ? localStorage.getItem('itresto-guest-id') 
          : null;
        
        if (deviceUuid) {
          try {
            const response = await fetch('/api/guest/link-account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deviceUuid }),
            });
            
            // Удаляем guest-id в любом случае (даже если device не найден в БД)
            // Запись в guest_devices создается только при первом заказе
            localStorage.removeItem('itresto-guest-id');
            
            if (!response.ok) {
            }
          } catch (err) {
            console.error('Failed to link guest account:', err);
            // Удаляем guest-id даже при ошибке
            localStorage.removeItem('itresto-guest-id');
          }
        }
        
        // Не сбрасываем loading при успешном входе - редирект произойдёт
        window.location.href = callbackUrl;
      }
    } catch (err) {
      setError('Произошла ошибка при входе');
      setLoading(false);
    }
  };

  // Быстрые кнопки для тестовых аккаунтов
  const quickLogin = async (role: string, email: string) => {
    setEmail(email);
    setPassword('password123');
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password: 'password123',
        redirect: false,
      });

      if (result?.error) {
        setError('Ошибка входа');
        setLoading(false);
      } else {
        // Связываем гостевой аккаунт
        const deviceUuid = typeof window !== 'undefined' 
          ? localStorage.getItem('itresto-guest-id') 
          : null;
        
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
        
        // Используем window.location для гарантированного редиректа
        window.location.href = callbackUrl;
      }
    } catch (err) {
      setError('Произошла ошибка при входе');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#3b82f6] to-purple-600 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-[#ffffff] p-8 shadow-xl">
          <h1 className="mb-6 text-center text-3xl font-bold text-[#111827]">
            Вход в систему
          </h1>

          {error && (
            <div className="mb-4 rounded-lg bg-[#fef2f2] p-3 text-sm text-[#dc2626]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#374151]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-[#111827] shadow-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#374151]">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-[#111827] shadow-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#2563eb] px-4 py-2 font-semibold text-[#ffffff] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          {/* Тестовые аккаунты */}
          <div className="mt-8 border-t pt-6">
            <p className="mb-3 text-center text-sm text-[#4b5563]">
              Быстрый вход (для тестирования):
            </p>
            <div className="space-y-2">
              <button
                onClick={() => quickLogin('waiter', 'waiter@demo.ru')}
                disabled={loading}
                className="w-full rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-[#ffffff] transition hover:bg-[#2563eb] disabled:opacity-50"
              >
                Официант
              </button>
              <button
                onClick={() => quickLogin('kitchen', 'kitchen@demo.ru')}
                disabled={loading}
                className="w-full rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-[#ffffff] transition hover:bg-[#ea580c] disabled:opacity-50"
              >
                Кухня
              </button>
              <button
                onClick={() => quickLogin('bar', 'bar@demo.ru')}
                disabled={loading}
                className="w-full rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-[#ffffff] transition hover:bg-purple-600 disabled:opacity-50"
              >
                Бар
              </button>
              <button
                onClick={() => quickLogin('supervisor', 'supervisor@demo.ru')}
                disabled={loading}
                className="w-full rounded-lg bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#ffffff] transition hover:bg-[#16a34a] disabled:opacity-50"
              >
                Управляющий
              </button>
              <button
                onClick={() => quickLogin('manager', 'manager@demo.ru')}
                disabled={loading}
                className="w-full rounded-lg bg-[#eab308] px-4 py-2 text-sm font-semibold text-[#ffffff] transition hover:bg-[#ca8a04] disabled:opacity-50"
              >
                Менеджер
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-[#6b7280]">
              Пароль для всех: password123
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-[#ffffff] hover:underline"
          >
            ← На главную
          </a>
        </div>
      </div>
    </div>
  );
}
