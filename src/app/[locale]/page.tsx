'use client';

import { Link } from '@/i18n/routing';
import { SignOutButton } from '@/components/SignOutButton';
import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

interface SessionUser {
  email: string;
  role: string;
  restaurantSlug?: string;
}

export default function LocaleHomePage() {
  const [session, setSession] = useState<{ user: SessionUser } | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    // Получаем сессию на клиенте
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setSession(data.user ? { user: data.user } : null);
        setLoading(false);
        
        // Если пользователь залогинен - перенаправляем
        if (data.user?.restaurantSlug) {
          handleRedirectByRole(data.user);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleRedirectByRole = (user: SessionUser) => {
    const role = user.role;
    let redirectPath = '';
    if (role === 'supervisor') redirectPath = 'supervisor';
    else if (role === 'manager') redirectPath = 'manager';
    else if (role === 'waiter') redirectPath = 'waiter';
    else if (role === 'kitchen_staff') redirectPath = 'kitchen';
    else if (role === 'bar_staff') redirectPath = 'bar';
    
    const locale = window.location.pathname.split('/')[1] || 'ru';
    const finalUrl = `/${locale}/${user.restaurantSlug}${redirectPath ? '/' + redirectPath : ''}`;
    
    console.log('Redirecting to:', finalUrl);
    console.log('User role:', role);
    console.log('Restaurant slug:', user.restaurantSlug);
    
    window.location.href = finalUrl;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Неверный email или пароль');
        setLoginLoading(false);
      } else {
        // Получаем информацию о пользователе из сессии
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        
        console.log('Session data after login:', sessionData);
        console.log('User:', sessionData?.user);
        console.log('Restaurant slug:', sessionData?.user?.restaurantSlug);
        
        if (sessionData?.user?.restaurantSlug) {
          handleRedirectByRole(sessionData.user);
        } else {
          setError('Не удалось определить ваш ресторан. Проверьте консоль для деталей.');
          setLoginLoading(false);
        }
      }
    } catch (err) {
      setError('Произошла ошибка при входе');
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-[#3b82f6] to-purple-600">
        <div className="text-white text-2xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-[#3b82f6] to-purple-600">
      <div className="text-center text-[#ffffff] max-w-4xl px-4 w-full">
        <h1 className="mb-8 text-6xl font-bold">ITResto</h1>
        <p className="mb-12 text-2xl">QR-код меню для ресторанов</p>
        
        {/* Форма входа для незалогиненных */}
        {!session?.user && (
          <div className="mb-8">
            <div className="rounded-lg bg-[#ffffff]/10 p-8 backdrop-blur-sm max-w-md mx-auto">
              <h2 className="mb-6 text-2xl font-semibold">Вход в систему</h2>
              <p className="mb-6 text-sm text-[#ffffff]/80">
                После регистрации войдите используя свой email и пароль
              </p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="text-left">
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="your@email.com"
                  />
                </div>

                <div className="text-left">
                  <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                    Пароль
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-500/20 border border-red-500 p-3 text-sm text-white">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full rounded-lg bg-[#ffffff] px-8 py-4 font-semibold text-[#2563eb] transition hover:bg-[#f3f4f6] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loginLoading ? 'Вход...' : 'Войти'}
                </button>
              </form>
            </div>
          </div>
        )}
        
        {session?.user && (
          <div className="mb-6 rounded-lg bg-[#ffffff]/20 p-4 backdrop-blur-sm max-w-md mx-auto">
            <p className="text-sm">
              Вы вошли как: <strong>{session.user.email}</strong> ({session.user.role})
            </p>
            <SignOutButton />
          </div>
        )}
        
        {/* Демо-ресторан (показываем всегда) */}
        <div className="space-y-4">
          <div className="rounded-lg bg-[#ffffff]/10 p-8 backdrop-blur-sm">
            <h2 className="mb-4 text-xl font-semibold">Демо ресторан</h2>
            <p className="mb-4 text-sm text-[#ffffff]/80">
              Попробуйте систему с тестовыми данными
            </p>
            <div className="flex flex-col gap-3">
              <Link 
                href="/demo" 
                className="rounded-lg bg-[#ffffff] px-6 py-3 font-semibold text-[#2563eb] transition hover:bg-[#f3f4f6]"
              >
                Меню клиента
              </Link>
              <Link 
                href="/demo/waiter" 
                className="rounded-lg bg-[#3b82f6] px-6 py-3 font-semibold text-[#ffffff] transition hover:bg-[#2563eb]"
              >
                Для официанта
              </Link>
              <Link 
                href="/demo/manager" 
                className="rounded-lg bg-[#eab308] px-6 py-3 font-semibold text-[#ffffff] transition hover:bg-[#ca8a04]"
              >
                Для менеджера
              </Link>
              <Link 
                href="/demo/kitchen" 
                className="rounded-lg bg-[#f97316] px-6 py-3 font-semibold text-[#ffffff] transition hover:bg-[#ea580c]"
              >
                Для отделов приготовления
              </Link>
              <Link 
                href="/demo/supervisor" 
                className="rounded-lg bg-[#22c55e] px-6 py-3 font-semibold text-[#ffffff] transition hover:bg-[#16a34a]"
              >
                Для управляющего
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
