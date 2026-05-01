import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, shifts, tables, users } from '@/lib/db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { OrderHistoryContent } from '@/components/waiter/OrderHistoryContent';

export default async function OrderHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; restaurant: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale, restaurant } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/${restaurant}/login`);
  }

  // Check if user is a waiter
  if (session.user.role !== 'waiter' && session.user.role !== 'manager' && session.user.role !== 'supervisor') {
    redirect(`/${locale}/${restaurant}`);
  }

  // Get all waiter shifts for filter dropdown
  const waiterShifts = await db
    .select({
      id: shifts.id,
      startedAt: shifts.startedAt,
      endedAt: shifts.endedAt,
    })
    .from(shifts)
    .where(eq(shifts.userId, session.user.id))
    .orderBy(desc(shifts.startedAt));

  // Get all tables for filter dropdown
  const allTables = await db
    .select({
      id: tables.id,
      number: tables.number,
    })
    .from(tables)
    .where(eq(tables.restaurantId, session.user.restaurantId))
    .orderBy(tables.number);

  return (
    <div className="min-h-screen bg-[#f9fafb] p-4">
      {/* Скрипт для уведомления React Native WebView о загрузке */}
      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          if (window.ReactNativeWebView) {
            window.addEventListener('load', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pageLoaded' }));
            });
            setTimeout(function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pageLoaded' }));
            }, 1000);
          }
        })();
      `}} />
      
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#111827]">
            История заказов
          </h1>
          <Link
            href={`/${locale}/${restaurant}/waiter/profile`}
            className="rounded-lg bg-[#f3f4f6] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#e5e7eb]"
          >
            ← Назад к профилю
          </Link>
        </div>

        <OrderHistoryContent
          userId={session.user.id}
          shifts={waiterShifts.map(s => ({
            ...s,
            startedAt: s.startedAt.toISOString(),
            endedAt: s.endedAt?.toISOString() || null,
          }))}
          tables={allTables}
        />
      </div>
    </div>
  );
}
