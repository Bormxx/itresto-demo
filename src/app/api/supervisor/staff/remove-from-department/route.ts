import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userDepartmentRoles } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { checkWriteRateLimit, getClientIp, createRateLimitResponse } from '@/lib/rateLimit';

// DELETE - Удалить сотрудников из отдела
export async function DELETE(request: Request) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const userIdsParam = searchParams.get('userIds');

    if (!departmentId || !userIdsParam) {
      return NextResponse.json({ error: 'Department ID and user IDs are required' }, { status: 400 });
    }

    const userIds = userIdsParam.split(',');

    // Удаляем все записи user_department_roles для этих пользователей в этом отделе
    await db
      .delete(userDepartmentRoles)
      .where(
        and(
          eq(userDepartmentRoles.departmentId, departmentId),
          inArray(userDepartmentRoles.userId, userIds)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing staff from department:', error);
    return NextResponse.json({ error: 'Failed to remove staff from department' }, { status: 500 });
  }
}
