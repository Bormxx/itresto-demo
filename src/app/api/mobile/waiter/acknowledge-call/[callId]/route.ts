/**
 * API endpoint для подтверждения вызова официанта
 * POST /api/mobile/waiter/acknowledge-call/:callId
 */
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { waiterCalls } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || 'default-secret'
  );

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    // Проверить авторизацию
    const payload = await verifyToken(request);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { callId } = await params;

    // Обновить вызов
    await db
      .update(waiterCalls)
      .set({
        acknowledgedAt: new Date(),
      })
      .where(eq(waiterCalls.id, callId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Acknowledge call error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
