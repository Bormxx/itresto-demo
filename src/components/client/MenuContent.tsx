'use client';

import { ImprovedMenuItemCard } from './ImprovedMenuItemCard';
import { useLocale, useTranslations } from 'next-intl';
import { getTranslatedName, getTranslatedDescription } from '@/lib/translations';

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  translations: string | Record<string, { name: string; description?: string }> | null;
  price: string;
  imageUrl?: string | null;
  calories?: number | null;
  proteins?: number | null;
  fats?: number | null;
  carbohydrates?: number | null;
  categoryId: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  translations: string | Record<string, { name: string; description?: string }> | null;
  displayOrder: number | null;
}

interface MenuContentProps {
  categories: Category[];
  items: MenuItem[];
  clientDiscount: number;
  tableId?: string;
  defaultLocale?: string;
}

export function MenuContent({ categories, items, clientDiscount, tableId, defaultLocale = 'ru' }: MenuContentProps) {
  const locale = useLocale();
  const t = useTranslations('common');

  // Фильтруем категории, у которых есть блюда
  const categoriesWithItems = categories.filter((category) => {
    return items.some((item) => item.categoryId === category.id);
  });

  if (categoriesWithItems.length === 0) {
    return (
      <div className="rounded-lg bg-[#ffffff] p-8 text-center shadow-sm">
        <p className="text-[#6b7280]">
          {t('menu.emptyMenu') || 'Меню пока не заполнено. Загляните позже!'}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Контент меню */}
      <div className="space-y-8">
        {categoriesWithItems.map((category) => {
          const categoryItems = items.filter(
            (item) => item.categoryId === category.id
          );

          if (categoryItems.length === 0) return null;

          return (
            <section
              key={category.id}
              data-category-id={category.id}
              className="mb-6"
            >
              <h3 className="mb-4 text-2xl font-semibold text-[#111827]">
                {getTranslatedName(
                  category.translations,
                  locale,
                  defaultLocale,
                  category.name
                )}
              </h3>
              <div className="flex flex-wrap gap-3">
                {categoryItems.map((item) => (
                  <ImprovedMenuItemCard
                    key={item.id}
                    item={item}
                    discountPercent={clientDiscount}
                    tableId={tableId}
                    defaultLocale={defaultLocale}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
