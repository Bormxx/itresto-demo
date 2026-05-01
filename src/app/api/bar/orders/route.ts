import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { orders, orderItems, departments, shiftSchedules, shiftStaffAssignments } from '@/lib/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'bar_staff') {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Найти текущую смену на сегодня
    const today = new Date().toISOString().split('T')[0];
    const currentSchedule = await db.query.shiftSchedules.findFirst({
      where: and(
        eq(shiftSchedules.restaurantId, session.user.restaurantId),
        eq(shiftSchedules.date, today)
      ),
    });

    if (!currentSchedule) {
      return NextResponse.json({
        success: false,
        error: 'no_shift',
        message: 'На сегодня не запланировано смен',
      });
    }

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

    if (!staffAssignment || !staffAssignment.departmentId) {
      return NextResponse.json({
        success: false,
        error: 'not_assigned',
        message: 'Вы не назначены на текущую смену. Обратитесь к менеджеру',
      });
    }

    // Загрузить активные заказы с позициями для отдела сотрудника
    const activeOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.restaurantId, session.user.restaurantId),
        inArray(orders.status, ['pending', 'confirmed', 'preparing'])
      ),
      with: {
        table: true,
        orderItems: {
          where: and(
            or(
              eq(orderItems.barStatus, 'pending'),
              eq(orderItems.barStatus, 'preparing')
            )
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
    });

    // Фильтруем только заказы для отдела сотрудника
    const departmentOrders = activeOrders
      .map((order) => ({
        ...order,
        orderItems: order.orderItems.filter(
          (item) =>
            item.menuItem?.prepDepartmentId === staffAssignment.departmentId
        ),
      }))
      .filter((order) => order.orderItems.length > 0);

    return NextResponse.json({
      success: true,
      orders: departmentOrders,
      departmentName: staffAssignment.department?.name || 'Отдел приготовления',
    });
  } catch (error) {
    console.error('Error fetching bar orders:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при загрузке заказов' },
      { status: 500 }
    );
  }
}
