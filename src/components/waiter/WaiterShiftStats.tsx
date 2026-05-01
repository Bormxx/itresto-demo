import { db } from '@/lib/db';
import { shifts, orders } from '@/lib/db/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';

interface WaiterShiftStatsProps {
  userId: string;
}

export async function WaiterShiftStats({ userId }: WaiterShiftStatsProps) {
  // Get current or last shift for this waiter
  const userShifts = await db
    .select()
    .from(shifts)
    .where(eq(shifts.userId, userId))
    .orderBy(desc(shifts.startedAt))
    .limit(1);

  if (userShifts.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-[#111827]">
          Статистика смены
        </h2>
        <p className="text-[#6b7280]">Нет активных или завершенных смен</p>
      </div>
    );
  }

  const currentShift = userShifts[0];
  const isActive = !currentShift.endedAt;

  // Get statistics for this shift (filter by time range and waiter)
  const [stats] = await db
    .select({
      orderCount: sql<number>`COUNT(DISTINCT ${orders.id})::int`,
      totalRevenue: sql<number>`COALESCE(SUM(${orders.total}), 0)::numeric`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.waiterId, userId),
        gte(orders.createdAt, currentShift.startedAt),
        currentShift.endedAt ? lte(orders.createdAt, currentShift.endedAt) : sql`true`
      )
    );

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#111827]">
          Статистика смены
        </h2>
        {isActive && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            Активная смена
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm text-[#6b7280]">Текущая смена</div>
          <div className="text-xs text-[#9ca3af]">
            {new Date(currentShift.startedAt).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {currentShift.endedAt && (
              <>
                {' — '}
                {new Date(currentShift.endedAt).toLocaleString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-[#f9fafb] p-4">
            <div className="text-sm text-[#6b7280]">Заказов обслужено</div>
            <div className="text-2xl font-bold text-[#111827]">
              {stats?.orderCount || 0}
            </div>
          </div>

          <div className="rounded-lg bg-[#f9fafb] p-4">
            <div className="text-sm text-[#6b7280]">Общая выручка</div>
            <div className="text-2xl font-bold text-[#10b981]">
              {Number(stats?.totalRevenue || 0).toLocaleString('ru-RU', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}{' '}
              ₸
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
