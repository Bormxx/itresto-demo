import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Dashboard from '@/components/supervisor/Dashboard';
import SupervisorCards from '@/components/supervisor/SupervisorCards';

export default async function SupervisorPage({
  params,
}: {
  params: Promise<{ restaurant: string; locale: string }>;
}) {
  const { restaurant, locale } = await params;
  const baseUrl = `/${locale}/${restaurant}/supervisor`;
  const t = await getTranslations('supervisor');

  // Get restaurant by slug to get the ID
  const [restaurantData] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, restaurant));

  if (!restaurantData) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('welcome')}
        </h1>
        <p className="mt-2 text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      {/* Dashboard widgets */}
      <Dashboard restaurantId={restaurantData.id} />

      <SupervisorCards baseUrl={baseUrl} restaurantId={restaurantData.id} />
    </div>
  );
}
