import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { demoRateLimits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Получаем IP адрес
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // Удаляем rate limit для этого IP
    await db
      .delete(demoRateLimits)
      .where(eq(demoRateLimits.ipAddress, ipAddress));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting rate limit:', error);
    return NextResponse.json(
      { error: 'Ошибка сброса лимита' },
      { status: 500 }
    );
  }
}
