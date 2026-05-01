import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import ReportsClient from '@/components/supervisor/ReportsClient';

interface PageProps {
  params: Promise<{ locale: string; restaurant: string }>;
}

export default async function AnalyticsPage({ params }: PageProps) {
  const session = await auth();
  const { locale, restaurant: restaurantSlug } = await params;

  if (!session?.user || !['supervisor', 'manager', 'owner', 'admin'].includes(session.user.role)) {
    redirect(`/${locale}/auth/login`);
  }

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.slug, restaurantSlug),
  });

  if (!restaurant || restaurant.id !== session.user.restaurantId) {
    redirect(`/${locale}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Отчёты и аналитика</h1>
        <p className="mt-1 text-sm text-gray-600">
          Статистика заказов, выручка и популярные блюда
        </p>
      </div>

      <ReportsClient restaurantId={restaurant.id} locale={locale} />
    </div>
  );
}
