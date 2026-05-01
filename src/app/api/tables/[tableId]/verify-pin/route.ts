import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tables } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const verifyPinSchema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/, 'PIN должен состоять из 4 цифр'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const body = await request.json();
    const { pin } = verifyPinSchema.parse(body);

    // Найти столик
    const table = await db.query.tables.findFirst({
      where: eq(tables.id, tableId),
    });

    if (!table) {
      return NextResponse.json(
        { success: false, error: 'Столик не найден' },
        { status: 404 }
      );
    }

    // Проверить PIN
    if (!table.pin) {
      // Столик свободен, PIN не установлен
      return NextResponse.json(
        { success: true, tableOccupied: false },
        { status: 200 }
      );
    }

    if (table.pin !== pin) {
      return NextResponse.json(
        { success: false, error: 'Неверный PIN-код' },
        { status: 403 }
      );
    }

    // PIN правильный
    return NextResponse.json(
      { success: true, tableOccupied: true },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат PIN', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error verifying PIN:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при проверке PIN' },
      { status: 500 }
    );
  }
}
