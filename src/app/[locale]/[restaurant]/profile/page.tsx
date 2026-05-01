import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { users, orders } from '@/lib/db/schema';
import Link from 'next/link';
import { ClientProfileForm } from '@/components/client/ClientProfileForm';

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurant: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const session = await auth();
  const { restaurant: slug } = await params;
  const { table } = await searchParams;

  // Только для авторизованных клиентов
  if (!session?.user || session.user.role !== 'client') {
    redirect(`/${slug}/auth/login?redirect=/${slug}/profile`);
  }

  // Получаем данные клиента
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    redirect(`/${slug}`);
  }

  // Получаем историю заказов клиента
  const userOrders = await db.query.orders.findMany({
    where: eq(orders.clientId, user.id),
    with: {
      orderItems: {
        with: {
          menuItem: true,
        },
      },
      table: true,
    },
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    limit: 20,
  });

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Header */}
      <header className="bg-[#ffffff] shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#111827]">Личный кабинет</h1>
            <Link
              href={table ? `/${slug}?table=${table}` : `/${slug}`}
              className="text-sm text-[#2563eb] hover:text-[#1d4ed8]"
            >
              ← К меню
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Профиль */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-[#111827]">
            Мой профиль
          </h2>
          <ClientProfileForm user={user} restaurant={slug} />
        </section>

        {/* История заказов */}
        <section>
          <h2 className="mb-4 text-xl font-semibold text-[#111827]">
            История заказов
          </h2>
          
          {userOrders.length === 0 ? (
            <div className="rounded-lg bg-[#ffffff] p-8 text-center shadow-sm">
              <p className="text-[#4b5563]">У вас пока нет заказов</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg bg-[#ffffff] p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[#4b5563]">
                        {new Date(order.createdAt).toLocaleString('ru-RU')}
                      </p>
                      {order.table && (
                        <p className="text-sm text-[#4b5563]">
                          Столик: {order.table.number}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                          order.status === 'completed'
                            ? 'bg-[#dcfce7] text-[#166534]'
                            : order.status === 'cancelled'
                            ? 'bg-[#fee2e2] text-[#991b1b]'
                            : 'bg-[#fef9c3] text-[#854d0e]'
                        }`}
                      >
                        {order.status === 'completed'
                          ? 'Выполнен'
                          : order.status === 'cancelled'
                          ? 'Отменён'
                          : 'В процессе'}
                      </span>
                      <p className="mt-2 text-lg font-semibold text-[#111827]">
                        {Number(order.total).toFixed(2)} ₽
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {order.orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-[#374151]">
                          {item.menuItem?.name || 'Неизвестное блюдо'} × {item.quantity}
                        </span>
                        <span className="text-[#111827]">
                          {Number(item.priceAtOrder).toFixed(2)} ₽
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
