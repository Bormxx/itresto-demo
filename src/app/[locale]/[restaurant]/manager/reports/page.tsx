import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReportsClient from '@/components/manager/ReportsClient';
import { db } from '@/lib/db';
import { tables, shifts, shiftStaffAssignments } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export default async function ManagerReportsPage({
  params,
}: {
  params: Promise<{ restaurant: string; locale: string }>;
}) {
  const session = await auth();
  const { restaurant, locale } = await params;

  if (!session?.user?.restaurantId) {
    redirect(`/${locale}/${restaurant}/auth/signin`);
  }

  // Получаем столики ресторана
  const restaurantTables = await db.query.tables.findMany({
    where: eq(tables.restaurantId, session.user.restaurantId),
    orderBy: tables.number,
  });

  // Получаем текущую смену
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

  // Получаем официантов текущей смены
  let shiftWaiters: Array<{ id: string; name: string }> = [];
  if (currentShift) {
    const assignments = await db.query.shiftStaffAssignments.findMany({
      where: eq(shiftStaffAssignments.shiftId, currentShift.id),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    shiftWaiters = assignments
      .filter(a => a.user)
      .map(a => ({
        id: a.user!.id,
        name: `${a.user!.firstName} ${a.user!.lastName}`.trim(),
      }));
  }

  return (
    <ReportsClient 
      restaurantId={session.user.restaurantId!}
      tables={restaurantTables.map(t => ({ id: t.id, number: t.number }))}
      shiftWaiters={shiftWaiters}
      currentShift={currentShift ? {
        id: currentShift.id,
        startedAt: currentShift.startedAt.toISOString(),
        endedAt: currentShift.endedAt?.toISOString() || null,
      } : null}
    />
  );
}
