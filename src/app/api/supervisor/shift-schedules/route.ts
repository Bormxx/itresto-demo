import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { 
  shiftSchedules, 
  shiftTemplates, 
  shiftTemplateStaffAssignments,
  shiftTemplateTableAssignments,
  shiftStaffAssignments,
  shiftTableAssignments,
  users,
  departments
} from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { 
  calculateEndTime, 
  validateShiftAddition, 
  validateStaffAssignments,
  type ShiftInfo,
  type StaffAssignmentInfo 
} from '@/lib/shiftValidation';

const createScheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  shiftTemplateId: z.string().uuid().optional(), // null если выходной
  isDayOff: z.boolean().default(false),
});

const updateScheduleSchema = z.object({
  shiftTemplateId: z.string().uuid().nullable().optional(),
  isDayOff: z.boolean().optional(),
});

// GET - получить расписание на период
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    if (!['supervisor', 'manager'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    if (!session.user.restaurantId) {
      return NextResponse.json({ error: 'Ресторан не найден' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Необходимо указать startDate и endDate' },
        { status: 400 }
      );
    }

    const schedules = await db
      .select({
        id: shiftSchedules.id,
        date: shiftSchedules.date,
        shiftTemplateId: shiftSchedules.shiftTemplateId,
        isDayOff: shiftSchedules.isDayOff,
        createdAt: shiftSchedules.createdAt,
        updatedAt: shiftSchedules.updatedAt,
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
          gte(shiftSchedules.date, startDate),
          lte(shiftSchedules.date, endDate)
        )
      )
      .orderBy(shiftSchedules.date);

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Error fetching shift schedules:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST - создать расписание на дату с валидацией пересечений
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, {status: 401 });
    }

    if (!['supervisor', 'manager'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    if (!session.user.restaurantId) {
      return NextResponse.json({ error: 'Ресторан не найден' }, { status: 400 });
    }

    const body = await request.json();
    const validation = createScheduleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Неверные данные', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { date, shiftTemplateId, isDayOff } = validation.data;

    // Если это выходной, просто создаем запись
    if (isDayOff) {
      const [schedule] = await db
        .insert(shiftSchedules)
        .values({
          restaurantId: session.user.restaurantId,
          date,
          shiftTemplateId: null,
          isDayOff: true,
        })
        .returning();

      return NextResponse.json({
        schedule: {
          ...schedule,
          template: null,
        },
      });
    }

    // Загружаем шаблон новой смены
    if (!shiftTemplateId) {
      return NextResponse.json({ error: 'Не указан шаблон смены' }, { status: 400 });
    }

    const [newTemplate] = await db
      .select()
      .from(shiftTemplates)
      .where(
        and(
          eq(shiftTemplates.id, shiftTemplateId),
          eq(shiftTemplates.restaurantId, session.user.restaurantId)
        )
      );

    if (!newTemplate) {
      return NextResponse.json({ error: 'Шаблон не найден' }, { status: 404 });
    }

    // Загружаем существующие смены на эту дату
    const existingSchedules = await db
      .select({
        id: shiftSchedules.id,
        shiftTemplateId: shiftSchedules.shiftTemplateId,
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
          eq(shiftSchedules.date, date),
          eq(shiftSchedules.isDayOff, false)
        )
      );

    // Подготавливаем данные новой смены для валидации
    const normalizedNewShiftStartTime = newTemplate.startTime.substring(0, 5);
    const newShiftInfo: ShiftInfo = {
      name: newTemplate.name,
      startTime: normalizedNewShiftStartTime,
      endTime: calculateEndTime(normalizedNewShiftStartTime, parseFloat(newTemplate.durationHours)),
      durationHours: parseFloat(newTemplate.durationHours),
    };

    // Подготавливаем данные существующих смен
    const existingShiftsInfo: ShiftInfo[] = existingSchedules
      .filter(s => s.template)
      .map(s => {
        const normalizedStartTime = s.template!.startTime.substring(0, 5);
        return {
          id: s.id,
          name: s.template!.name,
          startTime: normalizedStartTime,
          endTime: calculateEndTime(normalizedStartTime, parseFloat(s.template!.durationHours)),
          durationHours: parseFloat(s.template!.durationHours),
        };
      });

    // Валидация 1: Проверяем пересечение времени смен
    const shiftOverlapError = validateShiftAddition(newShiftInfo, existingShiftsInfo);
    if (shiftOverlapError) {
      return NextResponse.json({ 
        error: shiftOverlapError.message,
        validationError: shiftOverlapError 
      }, { status: 400 });
    }

    // Загружаем назначения сотрудников из нового шаблона
    const newTemplateStaff = await db
      .select({
        userId: shiftTemplateStaffAssignments.userId,
        departmentId: shiftTemplateStaffAssignments.departmentId,
        startTime: shiftTemplateStaffAssignments.startTime,
        durationHours: shiftTemplateStaffAssignments.durationHours,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
        department: {
          name: departments.name,
        },
      })
      .from(shiftTemplateStaffAssignments)
      .leftJoin(users, eq(shiftTemplateStaffAssignments.userId, users.id))
      .leftJoin(departments, eq(shiftTemplateStaffAssignments.departmentId, departments.id))
      .where(eq(shiftTemplateStaffAssignments.shiftTemplateId, shiftTemplateId));

    // Загружаем назначения сотрудников из существующих смен
    let existingStaff: StaffAssignmentInfo[] = [];
    
    if (existingSchedules.length > 0) {
      const existingStaffData = await db
        .select({
          userId: shiftStaffAssignments.userId,
          departmentId: shiftStaffAssignments.departmentId,
          startTime: shiftStaffAssignments.startTime,
          durationHours: shiftStaffAssignments.durationHours,
          user: {
            firstName: users.firstName,
            lastName: users.lastName,
          },
          department: {
            name: departments.name,
          },
        })
        .from(shiftStaffAssignments)
        .leftJoin(users, eq(shiftStaffAssignments.userId, users.id))
        .leftJoin(departments, eq(shiftStaffAssignments.departmentId, departments.id))
        .where(
          sql`${shiftStaffAssignments.shiftScheduleId} IN (${sql.join(existingSchedules.map(s => sql`${s.id}`), sql`, `)})`
        );

      existingStaff = existingStaffData.map(s => {
        // Нормализуем время к формату HH:MM (убираем секунды если есть)
        const normalizedStartTime = s.startTime.substring(0, 5);
        return {
          userId: s.userId,
          userName: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim(),
          departmentId: s.departmentId,
          departmentName: s.department?.name || null,
          startTime: normalizedStartTime,
          endTime: calculateEndTime(normalizedStartTime, parseFloat(s.durationHours)),
          durationHours: parseFloat(s.durationHours),
        };
      });
    }

    // Подготавливаем данные для валидации сотрудников
    const newShiftStaffInfo: StaffAssignmentInfo[] = newTemplateStaff.map(s => {
      // Нормализуем время к формату HH:MM (убираем секунды если есть)
      const normalizedStartTime = s.startTime.substring(0, 5);
      return {
        userId: s.userId,
        userName: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim(),
        departmentId: s.departmentId,
        departmentName: s.department?.name || null,
        startTime: normalizedStartTime,
        endTime: calculateEndTime(normalizedStartTime, parseFloat(s.durationHours)),
        durationHours: parseFloat(s.durationHours),
      };
    });

    // Валидация 2: Проверяем пересечение сотрудников
    const staffErrors = validateStaffAssignments(newShiftStaffInfo, existingStaff);
    
    if (staffErrors.length > 0) {
      return NextResponse.json({ 
        error: staffErrors[0].message,
        validationErrors: staffErrors 
      }, { status: 400 });
    }

    // Все проверки пройдены, создаем расписание
    const [schedule] = await db
      .insert(shiftSchedules)
      .values({
        restaurantId: session.user.restaurantId,
        date,
        shiftTemplateId,
        isDayOff: false,
      })
      .returning();

    // Копируем назначения сотрудников из шаблона
    if (newTemplateStaff.length > 0) {
      const staffAssignments = await db
        .insert(shiftStaffAssignments)
        .values(
          newTemplateStaff.map((assignment) => ({
            shiftScheduleId: schedule.id,
            userId: assignment.userId,
            departmentId: assignment.departmentId,
            startTime: assignment.startTime,
            durationHours: assignment.durationHours,
          }))
        )
        .returning();

      // Загружаем назначения столиков из шаблона
      const templateTableAssignments = await db
        .select()
        .from(shiftTemplateTableAssignments)
        .where(eq(shiftTemplateTableAssignments.shiftTemplateId, shiftTemplateId));

      // Копируем назначения столиков
      if (templateTableAssignments.length > 0) {
        // Создаем маппинг от template staff assignment id к новому staff assignment id
        const staffAssignmentMap = new Map<string, string>();
        const templateStaffIds = newTemplateStaff.map(s => s.userId);
        
        for (let i = 0; i < newTemplateStaff.length; i++) {
          // Находим соответствующий staffAssignment по userId и departmentId
          const templateStaff = newTemplateStaff[i];
          const matchingAssignment = staffAssignments.find(
            sa => sa.userId === templateStaff.userId && sa.departmentId === templateStaff.departmentId
          );
          if (matchingAssignment) {
            // Получаем id template staff assignment
            const whereConditions = [
              eq(shiftTemplateStaffAssignments.shiftTemplateId, shiftTemplateId),
              eq(shiftTemplateStaffAssignments.userId, templateStaff.userId),
            ];
            
            if (templateStaff.departmentId) {
              whereConditions.push(eq(shiftTemplateStaffAssignments.departmentId, templateStaff.departmentId));
            } else {
              whereConditions.push(sql`${shiftTemplateStaffAssignments.departmentId} IS NULL`);
            }
            
            const [templateStaffAssignment] = await db
              .select()
              .from(shiftTemplateStaffAssignments)
              .where(and(...whereConditions))
              .limit(1);
            
            if (templateStaffAssignment) {
              staffAssignmentMap.set(templateStaffAssignment.id, matchingAssignment.id);
            }
          }
        }

        // Копируем назначения столиков с правильными связями
        const tableAssignmentsToInsert = templateTableAssignments
          .filter(ta => staffAssignmentMap.has(ta.shiftTemplateStaffAssignmentId))
          .map(ta => ({
            shiftScheduleId: schedule.id,
            shiftStaffAssignmentId: staffAssignmentMap.get(ta.shiftTemplateStaffAssignmentId)!,
            tableId: ta.tableId,
            startTime: ta.startTime,
            durationHours: ta.durationHours,
          }));

        if (tableAssignmentsToInsert.length > 0) {
          await db.insert(shiftTableAssignments).values(tableAssignmentsToInsert);
        }
      }
    }

    return NextResponse.json({
      schedule: {
        ...schedule,
        template: newTemplate,
      },
    });
  } catch (error) {
    console.error('Error creating shift schedule:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
