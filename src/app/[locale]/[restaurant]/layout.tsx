import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import type { ThemeConfig } from '@/types';
import { SessionProvider } from '@/components/providers/SessionProvider';

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ restaurant: string }>;
}) {
  const { restaurant: slug } = await params;

  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.slug, slug),
  });

  if (!restaurant) {
    notFound();
  }

  // Парсим тему или используем дефолтную
  let theme: ThemeConfig = {
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
    accentColor: '#f59e0b',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    fontFamily: 'var(--font-pt-root-ui)',
    borderRadius: '0.5rem',
    buttonStyle: 'rounded',
  };

  if (restaurant.themeConfig) {
    try {
      theme = { ...theme, ...JSON.parse(restaurant.themeConfig) };
    } catch (e) {
      console.error('Failed to parse theme config:', e);
    }
  }

  return (
    <div
      style={{
        '--primary-color': theme.primaryColor,
        '--secondary-color': theme.secondaryColor,
        '--accent-color': theme.accentColor,
        '--bg-color': theme.backgroundColor,
        '--text-color': theme.textColor,
        '--border-radius': theme.borderRadius,
      } as React.CSSProperties}
    >
      <SessionProvider>{children}</SessionProvider>
    </div>
  );
}
