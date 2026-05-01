import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SupervisorNav from '@/components/supervisor/SupervisorNav';
import { ReactNode } from 'react';
import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export default async function SupervisorLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ restaurant: string; locale: string }>;
}) {
  const session = await auth();
  const { restaurant, locale } = await params;

  const allowedRoles = ['supervisor', 'admin'];

  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    redirect(`/${locale}/${restaurant}/auth/signin?callbackUrl=/${locale}/${restaurant}/supervisor`);
  }

  const restaurantId = session.user.restaurantId || '';

  // Получить название и логотип ресторана
  const [restaurantData] = await db
    .select({ 
      name: restaurants.name,
      logoUrl: restaurants.logoUrl
    })
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);

  return (
    <div className="min-h-screen bg-gray-50">
      <SupervisorNav 
        restaurant={restaurant} 
        locale={locale} 
        userName={session.user.name || session.user.email || ''} 
        restaurantId={restaurantId}
        restaurantName={restaurantData?.name}
        logoUrl={restaurantData?.logoUrl}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
