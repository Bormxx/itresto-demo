import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { tables } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import ReservationsClient from '@/components/manager/ReservationsClient';

export default async function ManagerReservationsPage({
  params,
}: {
  params: Promise<{ restaurant: string; locale: string }>;
}) {
  const session = await auth();
  const { restaurant, locale } = await params;

  if (!session?.user?.restaurantId) {
    redirect(`/${locale}/${restaurant}/auth/signin`);
  }

  // Получить столики ресторана
  const restaurantTables = await db.query.tables.findMany({
    where: eq(tables.restaurantId, session.user.restaurantId!),
    orderBy: (tables, { asc }) => [asc(tables.number)],
  });

  return (
    <ReservationsClient 
      restaurantId={session.user.restaurantId!}
      managerId={session.user.id}
      tables={restaurantTables}
    />
  );
}
