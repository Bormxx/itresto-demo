import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tables, orders, waiterCalls, reservations, waiterTables, shiftTableAssignments, shiftStaffAssignments, shiftSchedules } from '@/lib/db/schema';
import { eq, and, isNull, desc, gte, notInArray, or, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { WaiterDashboard } from '@/components/waiter/WaiterDashboard';
import { WaiterProfileButton } from '@/components/waiter/WaiterProfileButton';

export default async function WaiterPage({
  params,
}: {
  params: Promise<{ locale: string; restaurant: string }>;
}) {
  const session = await auth();
  const { locale, restaurant } = await params;
  
  // Разрешенные роли для доступа к панели официанта
  const allowedRoles = ['waiter', 'manager', 'supervisor', 'admin'];
  
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    redirect(`/${restaurant}/auth/signin?callbackUrl=/${restaurant}/waiter`);
  }

  // Для менеджеров и выше - показываем все столики
  const isManager = ['manager', 'supervisor', 'admin'].includes(session.user.role);
  
  let allTables;
  
  if (isManager) {
    // Менеджеры видят все столики
    allTables = await db.query.tables.findMany({
      where: eq(tables.restaurantId, session.user.restaurantId),
      orderBy: [tables.number],
    });
  } else {
    // Официанты видят только назначенные столики
    
    // Получаем столики через waiterTables (старая система прямого назначения)
    const directAssignments = await db.query.waiterTables.findMany({
      where: and(
        eq(waiterTables.waiterId, session.user.id),
        isNull(waiterTables.unassignedAt)
      ),
      with: {
        table: true,
      },
    });
    
    const directTableIds = directAssignments.map(a => a.tableId);
    
    // Получаем столики через смены (новая система)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Находим назначения официанта на сегодня
    const staffAssignments = await db.query.shiftStaffAssignments.findMany({
      where: and(
        eq(shiftStaffAssignments.userId, session.user.id)
      ),
      with: {
        shiftSchedule: true,
      },
    });
    
    // Фильтруем только назначения на сегодня
    const todayStaffAssignmentIds = staffAssignments
      .filter(sa => sa.shiftSchedule.date === today && !sa.shiftSchedule.isDayOff)
      .map(sa => sa.id);
    
    let shiftTableIds: string[] = [];
    
    if (todayStaffAssignmentIds.length > 0) {
      // Получаем назначения столиков для этих конкретных назначений официанта
      const tableAssignments = await db.query.shiftTableAssignments.findMany({
        where: inArray(shiftTableAssignments.shiftStaffAssignmentId, todayStaffAssignmentIds),
      });
      
      shiftTableIds = tableAssignments.map(ta => ta.tableId);
    }
    
    // Объединяем ID столиков из обеих систем
    // ВАЖНО: если есть назначения через смены (новая система), игнорируем старую систему waiterTables
    const assignedTableIds = shiftTableIds.length > 0 
      ? shiftTableIds 
      : [...new Set([...directTableIds, ...shiftTableIds])];
    
    if (assignedTableIds.length === 0) {
      // Если нет назначенных столиков, возвращаем пустой массив
      allTables = [];
    } else {
      // Получаем данные столиков
      allTables = await db.query.tables.findMany({
        where: and(
          eq(tables.restaurantId, session.user.restaurantId),
          inArray(tables.id, assignedTableIds)
        ),
        orderBy: [tables.number],
      });
    }
  }

  // Сортировать по номеру как число (number хранится как varchar)
  allTables.sort((a, b) => {
    const numA = parseInt(String(a.number), 10) || 0;
    const numB = parseInt(String(b.number), 10) || 0;
    return numA - numB;
  });

  // Загрузить все активные заказы с элементами (кроме завершенных и отмененных)
  const activeOrders = await db.query.orders.findMany({
    where: (orders, { eq, and, notInArray }) => and(
      eq(orders.restaurantId, session.user.restaurantId),
      notInArray(orders.status, ['completed', 'cancelled'])
    ),
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
    with: {
      orderItems: {
        with: {
          menuItem: true,
        },
      },
    },
  });

  // Сгруппировать заказы по столикам
  const tablesWithOrders = allTables.map(table => ({
    ...table,
    orders: activeOrders.filter(order => order.tableId === table.id),
  }));

  // Загрузить активные бронирования (подтвержденные, не истекшие)
  const now = new Date();
  const activeReservations = await db.query.reservations.findMany({
    where: and(
      eq(reservations.restaurantId, session.user.restaurantId),
      eq(reservations.status, 'confirmed'),
      gte(reservations.reservedTo, now)
    ),
    orderBy: [reservations.reservedFrom],
  });

  // Загрузить активные вызовы официанта
  const activeWaiterCalls = await db.query.waiterCalls.findMany({
    where: and(
      eq(waiterCalls.restaurantId, session.user.restaurantId),
      isNull(waiterCalls.acknowledgedAt)
    ),
    orderBy: [desc(waiterCalls.createdAt)],
  });

  // Сериализуем данные для передачи в клиентский компонент
  const serializedReservations = activeReservations.map(res => ({
    ...res,
    reservedFrom: res.reservedFrom.toISOString(),
    reservedTo: res.reservedTo.toISOString(),
    actualStartTime: res.actualStartTime?.toISOString() || null,
    createdAt: res.createdAt.toISOString(),
    updatedAt: res.updatedAt.toISOString(),
  }));

  const serializedWaiterCalls = activeWaiterCalls.map(call => ({
    ...call,
    createdAt: call.createdAt.toISOString(),
    acknowledgedAt: call.acknowledgedAt?.toISOString() || null,
  }));

  const serializedTablesWithOrders = tablesWithOrders.map(table => ({
    ...table,
    orders: table.orders.map(order => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="min-h-screen bg-[#f9fafb] p-4">
      {/* Скрипт для уведомления React Native WebView о загрузке */}
      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          if (window.ReactNativeWebView) {
            window.addEventListener('load', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pageLoaded' }));
            });
            setTimeout(function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pageLoaded' }));
            }, 1000);
          }
        })();
      `}} />
      
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#111827]">
            Панель официанта
          </h1>
          <WaiterProfileButton 
            restaurantSlug={restaurant}
            userName={session.user.name}
          />
        </div>

        <WaiterDashboard 
          initialTables={serializedTablesWithOrders.map(table => ({
            ...table,
            hasWaiterCall: serializedWaiterCalls.some(call => call.tableId === table.id),
          }))}
          waiterCalls={serializedWaiterCalls}
          reservations={serializedReservations}
        />
      </div>
    </div>
  );
}
