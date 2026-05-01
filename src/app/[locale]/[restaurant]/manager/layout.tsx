import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { restaurants } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import ManagerNav from '@/components/manager/ManagerNav';
import { ReactNode } from 'react';

export default async function ManagerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ restaurant: string; locale: string }>;
}) {
  const session = await auth();
  const { restaurant, locale } = await params;

  const allowedRoles = ['manager', 'supervisor', 'admin'];

  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    redirect(`/${locale}/${restaurant}/auth/signin?callbackUrl=/${locale}/${restaurant}/manager`);
  }

  // Получить название и логотип ресторана
  const [restaurantData] = await db
    .select({ 
      name: restaurants.name,
      logoUrl: restaurants.logoUrl
    })
    .from(restaurants)
    .where(eq(restaurants.id, session.user.restaurantId!))
    .limit(1);

  return (
    <div className="min-h-screen bg-gray-50">
      <ManagerNav 
        restaurant={restaurant} 
        locale={locale} 
        userName={session.user.name || session.user.email || ''} 
        restaurantName={restaurantData?.name}
        logoUrl={restaurantData?.logoUrl}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
