import { db } from '@/lib/db';
import { restaurants, menuCategories, menuItems, tables, orders } from '@/lib/db/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CartButton } from '@/components/client/CartButton';
import { MenuContent } from '@/components/client/MenuContent';
import { CategoryNav } from '@/components/client/CategoryNav';
import { CallWaiterButton } from '@/components/client/CallWaiterButton';
import { ClientPageWrapper } from '@/components/client/ClientPageWrapper';
import { TableAccessGuard } from '@/components/client/TableAccessGuard';
import { TablePinBadge } from '@/components/client/TablePinBadge';
import { ReservationButton } from '@/components/client/ReservationButton';
import { ClientAuthButton } from '@/components/client/ClientAuthButton';
import LanguageSelector from '@/components/client/LanguageSelector';
import { getTranslatedName } from '@/lib/translations';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export default async function ClientMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurant: string; locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { restaurant: slug, locale } = await params;
  const { table } = await searchParams;
  const session = await auth();
  const t = await getTranslations();

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.slug, slug),
  });

  if (!restaurant) {
    notFound();
  }

  // Проверка статуса столика, если указан table number
  let tableStatus: { status: string; message?: string } | null = null;
  let tableRecord: any = null;
  
  if (table) {
    // Ищем столик по номеру
    tableRecord = await db.query.tables.findFirst({
      where: and(
        eq(tables.number, table as string),
        eq(tables.restaurantId, restaurant.id)
      ),
    });

    if (tableRecord) {
      // Проверяем активные заказы (все кроме completed и cancelled)
      const activeOrders = await db.query.orders.findMany({
        where: and(
          eq(orders.tableId, tableRecord.id),
          notInArray(orders.status, ['completed', 'cancelled'])
        ),
      });

      // Показываем предупреждение для столиков с активными заказами
      if (activeOrders.length > 0) {
        // Столик занят, но не показываем предупреждение,
        // так как гость может быть тем, кто его занял
        tableStatus = {
          status: 'occupied',
        };
      } else {
        tableStatus = {
          status: 'available',
        };
      }
    }
  }

  // Для демо лояльность и резервации отключены
  let clientDiscount = 0;
  let activeReservation = null;
  const activePromotions: any[] = [];

  const categories = await db.query.menuCategories.findMany({
    where: and(
      eq(menuCategories.restaurantId, restaurant.id),
      eq(menuCategories.isActive, true)
    ),
    orderBy: (categories, { asc }) => [asc(categories.displayOrder)],
  });

  const items = await db.query.menuItems.findMany({
    where: and(
      eq(menuItems.restaurantId, restaurant.id),
      eq(menuItems.isAvailable, true)
    ),
  });

  return (
    <ClientPageWrapper tableId={tableRecord?.id}>
      <div className="min-h-screen bg-[#f9fafb]">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#ffffff] shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {restaurant.logoUrl ? (
                  <img
                    src={restaurant.logoUrl}
                    alt={restaurant.name}
                    className="h-12 w-auto"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-[#111827]">
                    {restaurant.name}
                  </h1>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {/* Language Selector */}
                <LanguageSelector 
                  availableLocales={restaurant.supportedContentLocales || ['ru']}
                />
                
                {/* PIN badge - показываем если есть PIN в localStorage */}
                {table && tableRecord && (
                  <TablePinBadge tableId={tableRecord.id} />
                )}
                
                {/* Call waiter button - показываем если есть столик */}
                {table && tableRecord ? (
                  <CallWaiterButton tableId={tableRecord.id} restaurantId={restaurant.id} />
                ) : (
                  <button
                    disabled
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#9ca3af] cursor-not-allowed"
                    title={t('order.callWaiter')}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                )}
                
                {/* Reservations link - только для авторизованных клиентов */}
                {session?.user && session.user.role === 'client' && (
                  <ReservationButton
                    restaurantId={restaurant.id}
                    clientId={session.user.id}
                    activeReservation={activeReservation}
                  />
                )}
                
                {/* Auth button */}
                <ClientAuthButton
                  isAuthenticated={session?.user?.role === 'client'}
                  locale={locale}
                  restaurantSlug={slug}
                  table={table as string | undefined}
                  profileLabel={t('common.profile')}
                  signInLabel={t('common.signIn')}
                />
                
                {/* Cart Button */}
                <CartButton tableId={tableRecord?.id} restaurantId={restaurant.id} />
              </div>
            </div>
          </div>
          
          {/* Навигация по категориям */}
          <CategoryNav 
            categories={categories
              .filter((category) => items.some((item) => item.categoryId === category.id))
              .map((category) => ({
                id: category.id,
                name: getTranslatedName(
                  category.translations,
                  locale,
                  restaurant.defaultContentLocale || 'ru',
                  category.name
                )
              }))} 
          />
        </header>

        {/* Защита доступа по PIN, если столик занят */}
        {table && tableRecord ? (
          <TableAccessGuard
            restaurantId={restaurant.id}
            tableId={tableRecord.id}
            tableNumber={table as string}
            hasActiveOrders={tableStatus?.status === 'occupied'}
          >
            <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Table status warning */}
        {tableStatus && tableStatus.message && (
          <div className={`mb-6 rounded-lg p-4 ${
            tableStatus.status === 'reserved' 
              ? 'bg-[#fef2f2] text-[#991b1b] border border-[#fecaca]' 
              : 'bg-[#fefce8] text-[#854d0e] border border-[#fef08a]'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-xl">{tableStatus.status === 'reserved' ? '⚠️' : 'ℹ️'}</span>
              <div>
                <p className="font-medium">
                  {tableStatus.status === 'reserved' ? 'Столик забронирован' : 'Столик занят'}
                </p>
                <p className="mt-1 text-sm">{tableStatus.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loyalty discount info */}
        {clientDiscount > 0 && (
          <div className="mb-6 rounded-lg bg-[#f0fdf4] p-4 border border-[#bbf7d0]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <p className="font-medium text-[#14532d]">
                  Ваша скидка по программе лояльности: {clientDiscount}%
                </p>
                <p className="mt-1 text-sm text-[#15803d]">
                  Все цены указаны с учётом вашей скидки
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active promotions */}
        {activePromotions.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-lg font-semibold text-[#111827]">🔥 Специальные предложения</h3>
            {activePromotions.map((promo) => (
              <div key={promo.id} className="rounded-lg bg-[#fff7ed] p-4 border border-[#fed7aa]">
                <h4 className="font-medium text-[#7c2d12]">{promo.title}</h4>
                {promo.description && (
                  <p className="mt-1 text-sm text-[#c2410c]">{promo.description}</p>
                )}
                {promo.discountPercent && (
                  <span className="mt-2 inline-block rounded bg-[#fed7aa] px-2 py-1 text-xs font-bold text-[#7c2d12]">
                    -{promo.discountPercent}% скидка
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <MenuContent
          categories={categories}
          items={items}
          clientDiscount={clientDiscount}
          tableId={tableRecord?.id}
          defaultLocale={restaurant.defaultContentLocale || 'ru'}
        />
            </main>
          </TableAccessGuard>
        ) : (
          <main className="mx-auto max-w-7xl px-4 py-8">
            {/* Loyalty discount info */}
            {clientDiscount > 0 && (
              <div className="mb-6 rounded-lg bg-[#f0fdf4] p-4 border border-[#bbf7d0]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎁</span>
                  <div>
                    <p className="font-medium text-[#14532d]">
                      Ваша скидка по программе лояльности: {clientDiscount}%
                    </p>
                    <p className="mt-1 text-sm text-[#15803d]">
                      Все цены указаны с учётом вашей скидки
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Active promotions */}
            {activePromotions.length > 0 && (
              <div className="mb-6 space-y-3">
                <h3 className="text-lg font-semibold text-[#111827]">🔥 Специальные предложения</h3>
                {activePromotions.map((promo) => (
                  <div key={promo.id} className="rounded-lg bg-[#fff7ed] p-4 border border-[#fed7aa]">
                    <h4 className="font-medium text-[#7c2d12]">{promo.title}</h4>
                    {promo.description && (
                      <p className="mt-1 text-sm text-[#c2410c]">{promo.description}</p>
                    )}
                    {promo.discountPercent && (
                      <span className="mt-2 inline-block rounded bg-[#fed7aa] px-2 py-1 text-xs font-bold text-[#7c2d12]">
                        -{promo.discountPercent}% скидка
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <MenuContent
              categories={categories}
              items={items}
              clientDiscount={clientDiscount}
              defaultLocale={restaurant.defaultContentLocale || 'ru'}
            />
          </main>
        )}
      </div>
    </ClientPageWrapper>
  );
}