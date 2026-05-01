import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { WaiterProfileEditor } from '@/components/waiter/WaiterProfileEditor';
import { WaiterShiftStats } from '@/components/waiter/WaiterShiftStats';
import { LogoutButton } from '@/components/waiter/LogoutButton';

export default async function WaiterProfilePage({
  params,
}: {
  params: Promise<{ locale: string; restaurant: string }>;
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

  // Get user data
  const [userData] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      avatar: users.avatar,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!userData) {
    redirect(`/${locale}/${restaurant}/login`);
  }

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
      
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#111827]">
            Личный кабинет
          </h1>
          <Link
            href={`/${locale}/${restaurant}/waiter`}
            className="rounded-lg bg-[#f3f4f6] px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#e5e7eb]"
          >
            ← Назад к панели
          </Link>
        </div>

        <div className="space-y-6">
          {/* Shift Statistics */}
          <WaiterShiftStats userId={session.user.id} />

          {/* Profile Editor */}
          <WaiterProfileEditor 
            userData={userData}
            restaurantSlug={restaurant}
          />

          {/* Order History Link */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-[#111827]">
              История заказов
            </h2>
            <Link
              href={`/${locale}/${restaurant}/waiter/profile/history`}
              className="inline-flex items-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 font-medium text-white transition hover:bg-[#059669]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Посмотреть историю заказов
            </Link>
          </div>

          {/* Logout Button */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-[#111827]">
              Выход
            </h2>
            <LogoutButton />
          </div>

          {/* Отступ для системной панели навигации Android */}
          <div className="h-16" />
        </div>
      </div>
    </div>
  );
}
