import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { reservations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const body = await req.json();
    const { status, notes, partySize, reservedFrom, reservedTo } = body;

    await db
      .update(reservations)
      .set({
        status: status || undefined,
        notes: notes !== undefined ? notes : undefined,
        partySize: partySize || undefined,
        reservedFrom: reservedFrom ? new Date(reservedFrom) : undefined,
        reservedTo: reservedTo ? new Date(reservedTo) : undefined,
        actualStartTime: status === 'confirmed' ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reservation update error:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления бронирования' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверка роли
    if (!['manager', 'supervisor', 'admin'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    await db.delete(reservations).where(eq(reservations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reservation deletion error:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления бронирования' },
      { status: 500 }
    );
  }
}
