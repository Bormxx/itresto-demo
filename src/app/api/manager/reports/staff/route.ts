import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { shiftSchedules, shiftStaffAssignments, departments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'RestaurantId обязателен' },
        { status: 400 }
      );
    }

    // Получаем расписание смены на сегодняшний день
    const today = new Date().toISOString().split('T')[0];
    const [currentSchedule] = await db.query.shiftSchedules.findMany({
      where: and(
        eq(shiftSchedules.restaurantId, restaurantId),
        eq(shiftSchedules.date, today)
      ),
      limit: 1,
    });

    // Если нет расписания смены на сегодня
    if (!currentSchedule) {
      return NextResponse.json({
        noShift: true,
        message: 'Текущая смена не назначена',
        departments: [],
      });
    }

    // Если день выходной
    if (currentSchedule.isDayOff) {
      return NextResponse.json({
        noShift: true,
        message: 'Сегодня выходной день',
        departments: [],
      });
    }

    // Получаем отделы из БД
    const restaurantDepartments = await db.query.departments.findMany({
      where: eq(departments.restaurantId, restaurantId),
      columns: {
        id: true,
        name: true,
      },
    });

    // Получаем назначения сотрудников на эту смену
    const assignments = await db.query.shiftStaffAssignments.findMany({
      where: eq(shiftStaffAssignments.shiftScheduleId, currentSchedule.id),
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
          with: {
            userDepartments: {
              with: {
                department: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Группируем по отделам (из БД)
    const departmentMap: Record<string, any[]> = {};
    
    // Инициализируем все отделы из БД
    restaurantDepartments.forEach((dept) => {
      departmentMap[dept.name] = [];
    });

    // Добавляем специальный отдел для сотрудников без назначения
    departmentMap['Без отдела'] = [];

    // Распределяем сотрудников по отделам
    assignments.forEach((assignment) => {
      if (!assignment.user) return;
      
      const user = assignment.user;
      const userDepts = user.userDepartments || [];
      
      if (userDepts.length === 0) {
        // Сотрудник не назначен ни в один отдел
        departmentMap['Без отдела'].push({
          id: user.id,
          name: `${user.firstName} ${user.lastName || ''}`.trim(),
          role: user.role || 'waiter',
        });
      } else {
        // Добавляем сотрудника во все его отделы
        userDepts.forEach((ud) => {
          if (ud.department) {
            const deptName = ud.department.name;
            if (departmentMap[deptName]) {
              departmentMap[deptName].push({
                id: user.id,
                name: `${user.firstName} ${user.lastName || ''}`.trim(),
                role: user.role || 'waiter',
              });
            }
          }
        });
      }
    });

    // Формируем результат (показываем только непустые отделы)
    const departmentsResult = Object.entries(departmentMap)
      .filter(([_, staff]) => staff.length > 0)
      .map(([department, staff]) => ({
        department,
        count: staff.length,
        staff,
      }));

    return NextResponse.json({
      departments: departmentsResult,
    });
  } catch (error) {
    console.error('Staff report error:', error);
    return NextResponse.json(
      { error: 'Ошибка генерации отчета по сотрудникам' },
      { status: 500 }
    );
  }
}
