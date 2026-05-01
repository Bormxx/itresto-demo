import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import PaymentSettingsClient from '@/components/supervisor/PaymentSettingsClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; restaurant: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'payments' });
  return {
    title: t('title'),
  };
}

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ locale: string; restaurant: string }>;
}) {
  const { restaurant: restaurantSlug } = await params;

  // Получаем ID ресторана по slug
  const [restaurantData] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, restaurantSlug));

  if (!restaurantData) {
    notFound();
  }

  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(var(--color-primary))]"></div>
          </div>
        }
      >
        <PaymentSettingsClient restaurantId={restaurantData.id} />
      </Suspense>
    </div>
  );
}
