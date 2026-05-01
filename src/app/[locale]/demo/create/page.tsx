'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface DemoData {
  restaurantSlug: string;
  demoNumber: string;
  password: string;
  users: {
    supervisor: string;
    manager: string;
    kitchen: string;
    bar: string;
  };
  expiresAt: string;
}

export default function DemoCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState<DemoData | null>(null);
  const [showRecreateModal, setShowRecreateModal] = useState(false);

  // Загрузка данных из localStorage при монтировании
  useEffect(() => {
    const savedDemo = localStorage.getItem('itresto_demo');
    if (savedDemo) {
      try {
        const demoData = JSON.parse(savedDemo);
        // Проверяем, не истекло ли демо
        const expiresAt = new Date(demoData.expiresAt);
        if (expiresAt > new Date()) {
          setDemo(demoData);
        } else {
          // Демо истекло, удаляем
          localStorage.removeItem('itresto_demo');
        }
      } catch (e) {
        console.error('Error loading demo from localStorage:', e);
        localStorage.removeItem('itresto_demo');
      }
    }
  }, []);

  const handleCreateDemo = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/demo/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось создать демо-ресторан');
      }

      // Сохраняем в localStorage
      localStorage.setItem('itresto_demo', JSON.stringify(data.demo));
      setDemo(data.demo);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при создании демо-ресторана');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (role: string) => {
    if (!demo) return;
    
    let email = '';
    switch (role) {
      case 'supervisor':
        email = demo.users.supervisor;
        break;
      case 'manager':
        email = demo.users.manager;
        break;
      case 'kitchen':
        email = demo.users.kitchen;
        break;
      case 'bar':
        email = demo.users.bar;
        break;
    }

    // Переход на страницу логина с pre-fill email
    router.push(`/ru?email=${encodeURIComponent(email)}&password=${encodeURIComponent(demo.password)}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRecreateDemo = async () => {
    setShowRecreateModal(false);
    setLoading(true);
    setError('');

    try {
      // Сначала очищаем rate limit
      await fetch('/api/demo/reset-limit', {
        method: 'POST',
      });

      // Затем создаем новый демо
      const response = await fetch('/api/demo/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось создать демо-ресторан');
      }

      // Сохраняем в localStorage
      localStorage.setItem('itresto_demo', JSON.stringify(data.demo));
      setDemo(data.demo);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при создании демо-ресторана');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndCreate = async () => {
    setLoading(true);
    setError('');

    try {
      // Очищаем rate limit
      await fetch('/api/demo/reset-limit', {
        method: 'POST',
      });

      // Создаем новый демо
      const response = await fetch('/api/demo/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось создать демо-ресторан');
      }

      // Сохраняем в localStorage
      localStorage.setItem('itresto_demo', JSON.stringify(data.demo));
      setDemo(data.demo);
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при создании демо-ресторана');
    } finally {
      setLoading(false);
    }
  };

  if (demo) {
    return (
      <>
        {/* Модальное окно подтверждения */}
        {showRecreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Пересоздать демо-ресторан?
              </h3>
              <p className="text-gray-600 mb-6">
                Текущий демо-ресторан будет заменён на новый с обновлёнными данными.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRecreateModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleRecreateDemo}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Пересоздать
                </button>
              </div>
            </div>
          </div>
        )}

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Демо-ресторан создан!
            </h1>
            <p className="text-gray-600">
              Ваш демо-ресторан <span className="font-semibold text-blue-600">{demo.demoNumber}</span> готов к использованию
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Данные для входа</h2>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">Супервизор (полный доступ)</span>
                  <button
                    onClick={() => handleLogin('supervisor')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Войти
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-900 font-medium">Email:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded flex-1 text-gray-900">{demo.users.supervisor}</code>
                  <button
                    onClick={() => copyToClipboard(demo.users.supervisor)}
                    className="text-blue-600 hover:text-blue-700"
                    title="Скопировать"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className="text-gray-900 font-medium">Пароль:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded flex-1 text-gray-900">{demo.password}</code>
                  <button
                    onClick={() => copyToClipboard(demo.password)}
                    className="text-blue-600 hover:text-blue-700"
                    title="Скопировать"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Менеджер</div>
                  <button
                    onClick={() => handleLogin('manager')}
                    className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded text-sm font-medium transition-colors"
                  >
                    Войти
                  </button>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Повар (кухня)</div>
                  <button
                    onClick={() => handleLogin('kitchen')}
                    className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded text-sm font-medium transition-colors"
                  >
                    Войти
                  </button>
                </div>

                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-600 mb-1">Бармен (бар)</div>
                  <button
                    onClick={() => handleLogin('bar')}
                    className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded text-sm font-medium transition-colors"
                  >
                    Войти
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm">
                <p className="font-semibold text-yellow-900 mb-1">Демо активно 24 часа</p>
                <p className="text-yellow-700">
                  Все данные будут автоматически удалены {new Date(demo.expiresAt).toLocaleString('ru-RU')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <h3 className="font-semibold text-gray-900">Что можно попробовать:</h3>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Супервизор</strong>: полный доступ к управлению рестораном, меню, персоналом, отчетами</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Менеджер</strong>: управление заказами, меню, отчеты</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>Повар/Бармен</strong>: экраны приготовления блюд и напитков</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span><strong>QR-меню для гостей</strong>: <a href={`/ru/${demo.restaurantSlug}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">открыть меню</a></span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                Понравилось? Создайте свой настоящий ресторан!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRecreateModal(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Пересоздать демо
                </button>
                <a
                  href="https://itresto.ru/register"
                  className="inline-block px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105"
                >
                  Начать бесплатно (6 месяцев)
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image 
              src="/logotype.svg" 
              alt="ITResto" 
              width={187} 
              height={62}
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Демо-версия ITResto
          </h1>
          <p className="text-xl text-gray-600">
            Попробуйте систему автоматизации ресторана прямо сейчас
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
            <div className="text-blue-600 mb-3">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Все роли доступны</h3>
            <p className="text-gray-600 text-sm">
              Попробуйте систему от лица супервизора, менеджера, повара или бармена
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
            <div className="text-purple-600 mb-3">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Готовое меню</h3>
            <p className="text-gray-600 text-sm">
              Демо-ресторан с готовыми блюдами, категориями и столиками
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
            <div className="text-green-600 mb-3">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Полная изоляция</h3>
            <p className="text-gray-600 text-sm">
              Ваш личный демо-ресторан - никто не помешает тестированию
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6">
            <div className="text-orange-600 mb-3">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">24 часа доступа</h3>
            <p className="text-gray-600 text-sm">
              Достаточно времени чтобы протестировать все функции системы
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              <p className="font-semibold mb-2">{error}</p>
              {error.includes('уже создали демо-ресторан') && (
                <p className="text-sm text-red-600 mt-2">
                  Если хотите пересоздать демо прямо сейчас, нажмите кнопку ниже
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCreateDemo}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Создаем ваш демо-ресторан...
                </span>
              ) : (
                'Создать демо-ресторан'
              )}
            </button>

            {error && error.includes('уже создали демо-ресторан') && (
              <button
                onClick={handleResetAndCreate}
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white text-lg font-semibold rounded-xl hover:from-orange-700 hover:to-red-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Пересоздаем...
                  </span>
                ) : (
                  '🔄 Пересоздать демо сейчас'
                )}
              </button>
            )}
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Бесплатно • Без регистрации • Готово за 5 секунд
          </p>
        </div>

        {/* Info Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3 text-center">Подключение мобильного приложения</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="mb-2">
              1. Скачайте приложение <a href="https://itresto.ru/download" className="text-blue-600 hover:underline font-semibold">ITResto Waiter</a>
            </p>
            <p className="mb-2">
              2. При входе используйте адрес сервера: <code className="bg-white px-2 py-1 rounded border">demo.itresto.ru</code>
            </p>
            <p>
              3. Введите логин и пароль любой из ролей (супервизор, менеджер, повар, бармен)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
