import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { 
  shiftTemplates, 
  shiftSchedules, 
  shiftStaffAssignments, 
  shiftTemplateStaffAssignments,
  shiftTemplateTableAssignments,
  departments, 
  users 
} from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { get14DayRange } from '@/lib/shifts';
import ShiftManagement from '@/components/supervisor/ShiftManagement';

export const metadata: Metadata = {
  title: 'Управление сменами',
  description: 'Планирование смен и назначение персонала',
};

// Отключаем кэширование для актуальности данных
export const revalidate = 0;

export default async function ManagerShiftsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; restaurant: string }>;
  searchParams: Promise<{ startDate?: string }>;
}) {
  const session = await auth();
  const { locale, restaurant: restaurantSlug } = await params;
  const { startDate } = await searchParams;

  if (!session?.user) {
    redirect(`/${locale}/${restaurantSlug}/auth/signin`);
  }

  if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
    redirect(`/${locale}/${restaurantSlug}`);
  }

  if (!session.user.restaurantId) {
    redirect(`/${locale}/${restaurantSlug}`);
  }

  // Безопасный парсинг даты из строки YYYY-MM-DD
  const parseDateString = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Получаем диапазон дат (14 дней)
  const dateRange = get14DayRange(startDate ? parseDateString(startDate) : undefined);

  // Загружаем шаблоны смен
  const templates = await db
    .select()
    .from(shiftTemplates)
    .where(eq(shiftTemplates.restaurantId, session.user.restaurantId))
    .orderBy(shiftTemplates.startTime);

  // Загружаем расписание на период
  const schedules = await db
    .select({
      id: shiftSchedules.id,
      date: shiftSchedules.date,
      shiftTemplateId: shiftSchedules.shiftTemplateId,
      isDayOff: shiftSchedules.isDayOff,
      template: {
        id: shiftTemplates.id,
        name: shiftTemplates.name,
        startTime: shiftTemplates.startTime,
        durationHours: shiftTemplates.durationHours,
      },
    })
    .from(shiftSchedules)
    .leftJoin(shiftTemplates, eq(shiftSchedules.shiftTemplateId, shiftTemplates.id))
    .where(
      and(
        eq(shiftSchedules.restaurantId, session.user.restaurantId),
        gte(shiftSchedules.date, dateRange.startDate),
        lte(shiftSchedules.date, dateRange.endDate)
      )
    )
    .orderBy(shiftSchedules.date);

  // Загружаем отделы
  const departmentsList = await db
    .select()
    .from(departments)
    .where(eq(departments.restaurantId, session.user.restaurantId));

  // Для каждого шаблона загружаем информацию о назначенных сотрудниках по отделам
  const templateStats = await Promise.all(
    templates.map(async (template) => {
      // Получаем назначения сотрудников для шаблона
      const assignments = await db
        .select({
          departmentId: shiftTemplateStaffAssignments.departmentId,
          userId: shiftTemplateStaffAssignments.userId,
          staffAssignmentId: shiftTemplateStaffAssignments.id,
          startTime: shiftTemplateStaffAssignments.startTime,
          durationHours: shiftTemplateStaffAssignments.durationHours,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(shiftTemplateStaffAssignments)
        .leftJoin(users, eq(shiftTemplateStaffAssignments.userId, users.id))
        .where(eq(shiftTemplateStaffAssignments.shiftTemplateId, template.id));

      // Получаем назначения на столики для этого шаблона
      const tableAssignments = await db
        .select({
          staffAssignmentId: shiftTemplateTableAssignments.shiftTemplateStaffAssignmentId,
        })
        .from(shiftTemplateTableAssignments)
        .where(eq(shiftTemplateTableAssignments.shiftTemplateId, template.id));

      // Создаем Set с ID назначений, у которых есть столики
      const staffWithTables = new Set(
        tableAssignments.map(ta => ta.staffAssignmentId)
      );

      const departmentCounts: Record<string, number> = {};
      const departmentAssignments: Record<string, Array<{
        userId: string;
        firstName: string;
        lastName: string;
        startTime: string;
        durationHours: string;
        hasTableAssignments: boolean;
      }>> = {};

      for (const assignment of assignments) {
        const deptId = assignment.departmentId || 'no-department';
        departmentCounts[deptId] = (departmentCounts[deptId] || 0) + 1;
        
        if (!departmentAssignments[deptId]) {
          departmentAssignments[deptId] = [];
        }
        
        departmentAssignments[deptId].push({
          userId: assignment.userId,
          firstName: assignment.firstName || '',
          lastName: assignment.lastName || '',
          startTime: assignment.startTime,
          durationHours: assignment.durationHours,
          hasTableAssignments: staffWithTables.has(assignment.staffAssignmentId),
        });
      }

      return {
        ...template,
        departmentCounts,
        departmentAssignments,
      };
    })
  );

  return (
    <ShiftManagement
      initialTemplates={templateStats}
      initialSchedules={schedules}
      departments={departmentsList}
      dateRange={dateRange}
      locale={locale}
      restaurantSlug={restaurantSlug}
    />
  );
}
