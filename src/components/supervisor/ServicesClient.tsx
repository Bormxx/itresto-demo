'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import ServicesIcon from '@/components/icons/ServicesIcon';
import { CardSkeleton } from '@/components/ui/Skeleton';

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isFree: boolean;
  isSubscribed: boolean;
  activatedAt: string | null;
  expiresAt: string | null;
}

interface Restaurant {
  logoUrl: string | null;
}

export default function ServicesClient() {
  const [services, setServices] = useState<Service[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Проверяем, имеет ли ресторан платный тариф
  const hasPremiumPlan = services.some(s => s.isSubscribed && !s.isFree);

  useEffect(() => {
    fetchServices();
    fetchRestaurantData();
  }, []);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/supervisor/services');
      
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }

      const data = await response.json();
      setServices(data.services);
      setActiveCount(data.activeCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch services');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRestaurantData = async () => {
    try {
      const response = await fetch('/api/supervisor/restaurant');
      if (response.ok) {
        const data = await response.json();
        setLogoUrl(data.restaurant?.logoUrl || null);
      }
    } catch (err) {
      console.error('Failed to fetch restaurant data:', err);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setLogoError(null);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/supervisor/restaurant/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to upload logo');
      }

      setLogoUrl(data.logoUrl);
      alert('Логотип успешно загружен!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при загрузке логотипа';
      setLogoError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить логотип?')) {
      return;
    }

    setIsUploadingLogo(true);
    setLogoError(null);

    try {
      const response = await fetch('/api/supervisor/restaurant/logo', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete logo');
      }

      setLogoUrl(null);
      alert('Логотип успешно удален!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка при удалении логотипа';
      setLogoError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price: string, isFree: boolean) => {
    if (isFree) return 'Бесплатно';
    return `${parseFloat(price).toLocaleString('ru-RU')} ₽`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Ошибка: {error}
      </div>
    );
  }

  // Сортируем тарифы в нужном порядке: Базовый → Расширенный → Полный
  const serviceOrder = ['Базовый', 'Расширенный', 'Полный'];
  const sortedServices = [...services].sort((a, b) => {
    const indexA = serviceOrder.indexOf(a.name);
    const indexB = serviceOrder.indexOf(b.name);
    // Если услуга не в списке, помещаем её в конец
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление услугами</h1>
          <p className="text-gray-600 mt-1">
            Активных подписок: <span className="font-semibold text-[rgb(var(--color-primary))]">{activeCount}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <ServicesIcon className="w-5 h-5 text-blue-600" />
          <span className="text-sm text-blue-900 font-medium">
            Всего услуг: {services.length}
          </span>
        </div>
      </div>

      {/* Секция загрузки логотипа */}
      <div className="border rounded-lg p-6 bg-white">
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Логотип ресторана</h2>
            <p className="text-gray-600 text-sm mb-4">
              {hasPremiumPlan 
                ? 'Загрузите логотип вашего ресторана, который будет отображаться во всех интерфейсах'
                : 'Изменение логотипа доступно только на платных тарифах'
              }
            </p>

            {logoUrl && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Текущий логотип:</p>
                <img 
                  src={logoUrl} 
                  alt="Логотип ресторана" 
                  className="h-16 w-auto border border-gray-200 rounded-lg p-2"
                />
              </div>
            )}

            <div className="flex gap-3">
              {hasPremiumPlan ? (
                <>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="hidden"
                    />
                    <Button
                      as="span"
                      variant="primary"
                      disabled={isUploadingLogo}
                    >
                      {isUploadingLogo ? 'Загрузка...' : logoUrl ? 'Изменить логотип' : 'Загрузить логотип'}
                    </Button>
                  </label>
                  {logoUrl && (
                    <Button
                      variant="secondary"
                      onClick={handleLogoDelete}
                      disabled={isUploadingLogo}
                    >
                      Удалить логотип
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                  💡 Перейдите на платный тариф, чтобы загрузить свой логотип
                </div>
              )}
            </div>

            {logoError && (
              <p className="text-red-600 text-sm mt-2">{logoError}</p>
            )}

            <p className="text-xs text-gray-500 mt-3">
              Поддерживаемые форматы: JPEG, PNG, SVG, WebP. Максимальный размер: 2 МБ
            </p>
          </div>
        </div>
      </div>

      {/* Список услуг */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedServices.map(service => (
          <div
            key={service.id}
            className={`border rounded-lg p-6 transition-all ${
              service.isSubscribed
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Заголовок услуги */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {service.name}
                </h3>
                {service.isSubscribed && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Подключено
                  </span>
                )}
              </div>
            </div>

            {/* Описание */}
            {service.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {service.description}
              </p>
            )}

            {/* Цена */}
            <div className="mb-4">
              <span className="text-2xl font-bold text-[rgb(var(--color-primary))]">
                {formatPrice(service.price, service.isFree)}
              </span>
              {!service.isFree && (
                <span className="text-gray-500 text-sm ml-1">/ месяц</span>
              )}
            </div>

            {/* Информация о подписке */}
            {service.isSubscribed && (
              <div className="space-y-2 pt-3 border-t border-green-200">
                <div className="text-sm">
                  <span className="text-gray-600">Активирована:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {formatDate(service.activatedAt)}
                  </span>
                </div>
                {service.expiresAt && (
                  <div className="text-sm">
                    <span className="text-gray-600">Истекает:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {formatDate(service.expiresAt)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Кнопка действия */}
            <div className="mt-4">
              <Button
                variant="secondary"
                className="w-full"
                disabled
              >
                {service.isSubscribed ? 'Управление' : 'Подключить'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Если услуг нет */}
      {services.length === 0 && (
        <div className="text-center py-12">
          <ServicesIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Нет доступных услуг</p>
        </div>
      )}
    </div>
  );
}
