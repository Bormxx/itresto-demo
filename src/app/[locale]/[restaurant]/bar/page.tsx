import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, orderItems, departments, shiftSchedules, shiftStaffAssignments } from '@/lib/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { BarDashboard } from '@/components/bar/BarDashboard';

export default async function BarPage({
  params,
}: {
  params: Promise<{ restaurant: string }>;
}) {
  const session = await auth();
  
  // Разрешенные роли для доступа к бару
  const allowedRoles = ['bar_staff', 'manager', 'supervisor', 'admin'];
  
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    const { restaurant } = await params;
    redirect(`/${restaurant}/auth/signin?callbackUrl=/${restaurant}/bar`);
  }

  let staffDepartmentId: string | null = null;
  let departmentName = 'Отдел приготовления';
  let notAssigned = false;

  // Только для bar_staff проверяем назначение в смене
  if (session.user.role === 'bar_staff') {
    // Найти текущую смену на сегодня
    const today = new Date().toISOString().split('T')[0];
    const currentSchedule = await db.query.shiftSchedules.findFirst({
      where: and(
        eq(shiftSchedules.restaurantId, session.user.restaurantId),
        eq(shiftSchedules.date, today)
      ),
    });

    if (currentSchedule) {
      // Найти назначение сотрудника в текущей смене
      const staffAssignment = await db.query.shiftStaffAssignments.findFirst({
        where: and(
          eq(shiftStaffAssignments.shiftScheduleId, currentSchedule.id),
          eq(shiftStaffAssignments.userId, session.user.id)
        ),
        with: {
          department: true,
        },
      });

      if (staffAssignment && staffAssignment.departmentId) {
        staffDepartmentId = staffAssignment.departmentId;
        departmentName = staffAssignment.department?.name || 'Отдел приготовления';
      } else {
        notAssigned = true;
      }
    } else {
      notAssigned = true;
    }
  } else {
    // Для manager/supervisor показываем весь бар
    const barDept = await db.query.departments.findFirst({
      where: and(
        eq(departments.restaurantId, session.user.restaurantId),
        eq(departments.name, 'Бар'),
        eq(departments.isFoodPreparation, true)
      ),
    });
    staffDepartmentId = barDept?.id || null;
    departmentName = 'Бар';
  }

  // Загрузить активные заказы с позициями для отдела
  const activeOrders = staffDepartmentId ? await db.query.orders.findMany({
    where: and(
      eq(orders.restaurantId, session.user.restaurantId),
      eq(orders.status, 'pending')
    ),
    with: {
      table: true,
      orderItems: {
        where: or(
          eq(orderItems.barStatus, 'pending'),
          eq(orderItems.barStatus, 'preparing'),
          eq(orderItems.barStatus, 'ready'),
          eq(orderItems.barStatus, 'delivered')
        ),
        with: {
          menuItem: {
            with: {
              prepDepartment: true,
            },
          },
        },
      },
    },
  }) : [];

  // Фильтруем только заказы для отдела сотрудника
  const departmentOrders = activeOrders
    .map((order) => ({
      ...order,
      orderItems: order.orderItems.filter(
        (item) =>
          item.menuItem?.prepDepartmentId === staffDepartmentId
      ),
    }))
    .filter((order) => order.orderItems.length > 0);

  // Функция для определения приоритета статуса (меньше = выше в списке)
  const getStatusPriority = (status: string | null) => {
    switch (status) {
      case 'pending': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'delivered': return 4;
      default: return 5;
    }
  };

  // Сортировать заказы: сначала по минимальному приоритету блюд, потом по времени создания
  const sortedOrders = departmentOrders.sort((a, b) => {
    const minPriorityA = Math.min(...a.orderItems.map(item => getStatusPriority(item.barStatus)));
    const minPriorityB = Math.min(...b.orderItems.map(item => getStatusPriority(item.barStatus)));
    
    if (minPriorityA !== minPriorityB) {
      return minPriorityA - minPriorityB;
    }
    
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="min-h-screen bg-[#f9fafb] p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#111827]">
            🍹 {departmentName}
          </h1>
          <div className="text-sm text-[#4b5563]">
            {session.user.name || session.user.email}
          </div>
        </div>

        <BarDashboard
          initialOrders={sortedOrders}
          notAssigned={notAssigned}
        />
      </div>
    </div>
  );
}
