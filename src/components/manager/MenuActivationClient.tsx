'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  name: { [locale: string]: string };
  description: { [locale: string]: string } | null;
  price: string;
  imageUrl: string | null;
  isActive: boolean;
  categoryId: string;
}

interface MenuCategory {
  id: string;
  name: { [locale: string]: string };
  items: MenuItem[];
}

interface MenuActivationClientProps {
  restaurantId: string;
  supportedLocales: string[];
}

export default function MenuActivationClient({ restaurantId, supportedLocales }: MenuActivationClientProps) {
  const t = useTranslations();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  const currentLocale = supportedLocales[0] || 'ru';

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  const fetchMenu = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/menu/${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch menu');
      
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching menu:', error);
      toast.error('Ошибка загрузки меню');
    } finally {
      setIsLoading(false);
    }
  };

  // Вспомогательная функция для получения переведенного текста
  const getLocalizedText = (text: any, fallback: string = 'Без названия'): string => {
    if (!text) return fallback;
    if (typeof text === 'string') return text;
    if (typeof text === 'number') return String(text);
    
    if (typeof text === 'object' && text !== null) {
      // Проверяем структуру { ru: { name: "...", description: "..." } }
      if (currentLocale in text && typeof text[currentLocale] === 'object' && text[currentLocale].name) {
        return String(text[currentLocale].name);
      }
      
      if ('ru' in text && typeof text['ru'] === 'object' && text['ru'].name) {
        return String(text['ru'].name);
      }
      
      // Проверяем простую структуру { ru: "..." }
      if (currentLocale in text && typeof text[currentLocale] === 'string') {
        return text[currentLocale];
      }
      
      if ('ru' in text && typeof text['ru'] === 'string') {
        return text['ru'];
      }
      
      // Берем первое строковое значение из объекта
      for (const key in text) {
        if (typeof text[key] === 'string' && text[key]) {
          return text[key];
        }
        // Если значение - объект с name
        if (typeof text[key] === 'object' && text[key] && text[key].name) {
          return String(text[key].name);
        }
      }
    }
    
    return fallback;
  };

  const handleToggleClick = async (item: MenuItem) => {
    const newStatus = !item.isActive;
    
    try {
      const response = await fetch(`/api/menu/${restaurantId}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update item');

      // Обновляем локальное состояние
      setCategories(prev =>
        prev.map(category => ({
          ...category,
          items: category.items.map(i =>
            i.id === item.id ? { ...i, isActive: newStatus } : i
          ),
        }))
      );

      toast.success(newStatus ? 'Блюдо активировано' : 'Блюдо деактивировано');
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error('Ошибка изменения статуса блюда');
    }
  };

  if (isLoading) {
    return <LoadingState message="Загрузка меню..." />;
  }

  if (categories.length === 0) {
    return <EmptyState title="Меню пусто" description="Добавьте блюда в меню" />;
  }

  // Опции для фильтра категорий
  const categoryOptions = [
    { value: 'all', label: 'Все категории' },
    ...categories.map(category => {
      const label = getLocalizedText(category.name);
      return {
        value: category.id,
        label: String(label)
      };
    })
  ];

  // Фильтрация категорий
  const filteredCategories = selectedCategoryId === 'all' 
    ? categories 
    : categories.filter(cat => cat.id === selectedCategoryId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Активация блюд в меню</h1>
        <p className="mt-1 text-sm text-gray-600">
          Включите или выключите отображение блюд в меню для гостей
        </p>
      </div>

      {/* Фильтр категорий */}
      <div className="mb-6">
        <Select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          options={categoryOptions}
          placeholder="Выберите категорию"
        />
      </div>

      <div className="space-y-8">
        {filteredCategories.map((category) => (
          <div key={category.id}>
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              {getLocalizedText(category.name)}
            </h2>
            
            <div className="flex flex-wrap gap-3">
              {category.items.map((item) => (
                <div 
                  key={item.id} 
                  className="relative flex h-[235px] w-[calc(50%-7px)] max-w-[180px] flex-col items-center rounded-3xl bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* Изображение */}
                  <div className="relative w-full">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={getLocalizedText(item.name)}
                        className="h-[150px] w-full rounded-3xl object-cover"
                      />
                    ) : (
                      <div className="flex h-[150px] w-full items-center justify-center rounded-3xl bg-gray-200 text-gray-400">
                        <svg
                          className="h-12 w-12"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Информация */}
                  <div className="flex w-full flex-1 flex-col px-3 pb-2 pt-2">
                    <h3 className="mb-1 text-sm font-semibold text-gray-900 line-clamp-1">
                      {getLocalizedText(item.name)}
                    </h3>
                    <div className="mb-2 text-sm font-bold text-gray-900">
                      {item.price} ₽
                    </div>

                    {/* Переключатель */}
                    <div className="mt-auto flex items-center justify-between">
                      <Badge variant={item.isActive ? 'success' : 'default'} rounded>
                        {item.isActive ? 'Вкл' : 'Выкл'}
                      </Badge>
                      <button
                        onClick={() => handleToggleClick(item)}
                        className={`
                          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                          ${item.isActive ? 'bg-green-600' : 'bg-gray-300'}
                        `}
                      >
                        <span
                          className={`
                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                            ${item.isActive ? 'translate-x-6' : 'translate-x-1'}
                          `}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
