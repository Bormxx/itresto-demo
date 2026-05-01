import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OrdersViewClient from '@/components/manager/OrdersViewClient';
import { db } from '@/lib/db';
import { shifts } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export default async function ManagerOrdersPage({
  params,
}: {
  params: Promise<{ restaurant: string; locale: string }>;
}) {
  const session = await auth();
  const { restaurant, locale } = await params;

  if (!session?.user?.restaurantId) {
    redirect(`/${locale}/${restaurant}/auth/signin`);
  }

  // Получаем текущую активную смену ресторана
  const [currentShift] = await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.restaurantId, session.user.restaurantId),
        isNull(shifts.endedAt)
      )
    )
    .orderBy(shifts.startedAt)
    .limit(1);

  return (
    <OrdersViewClient 
      restaurantId={session.user.restaurantId!}
      currentShift={currentShift ? {
        id: currentShift.id,
        startedAt: currentShift.startedAt.toISOString(),
        endedAt: currentShift.endedAt?.toISOString() || null,
      } : null}
    />
  );
}
