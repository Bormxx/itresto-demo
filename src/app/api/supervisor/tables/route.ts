import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tables } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

// GET - Получить все столики ресторана
export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const restaurantTables = await db
      .select()
      .from(tables)
      .where(eq(tables.restaurantId, session.user.restaurantId))
      .orderBy(tables.number);

    return NextResponse.json(restaurantTables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
  }
}

// POST - Создать новый столик
export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { number, description, capacity, pin } = body;

    if (!number) {
      return NextResponse.json({ error: 'Table number is required' }, { status: 400 });
    }

    // Проверка уникальности номера столика
    const existingTable = await db
      .select()
      .from(tables)
      .where(
        and(
          eq(tables.restaurantId, session.user.restaurantId),
          eq(tables.number, number)
        )
      )
      .limit(1);

    if (existingTable.length > 0) {
      return NextResponse.json(
        { error: 'Table with this number already exists' },
        { status: 409 }
      );
    }

    // Создать столик без QR-кода (сгенерируем позже)
    const newTable = await db
      .insert(tables)
      .values({
        restaurantId: session.user.restaurantId,
        number,
        description,
        capacity: capacity || 4,
        pin: pin || null,
        status: 'available',
      })
      .returning();

    // Попытаться сгенерировать QR-код (если не получится - не критично)
    try {
      // Получаем slug ресторана из БД
      const restaurant = await db.query.restaurants.findFirst({
        where: (restaurants, { eq }) => eq(restaurants.id, session.user.restaurantId),
      });

      if (restaurant) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const qrUrl = `${baseUrl}/${restaurant.slug}?table=${number}`;
        
        const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        // Обновить столик с QR-кодом
        const updatedTable = await db
          .update(tables)
          .set({ qrCode: qrCodeDataUrl })
          .where(eq(tables.id, newTable[0].id))
          .returning();

        return NextResponse.json(updatedTable[0], { status: 201 });
      } else {
        console.error('Restaurant not found in DB, restaurantId:', session.user.restaurantId);
      }
    } catch (qrError) {
      console.error('Error generating QR code (table created successfully):', qrError);
      // Продолжаем, возвращая столик без QR-кода
    }

    // Вернуть столик без QR-кода, если генерация не удалась
    return NextResponse.json(newTable[0], { status: 201 });
  } catch (error) {
    console.error('Error creating table:', error);
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 });
  }
}

// PATCH - Обновить столик
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, number, description, capacity, pin, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    // Проверка, что столик принадлежит ресторану
    const existingTable = await db
      .select()
      .from(tables)
      .where(
        and(
          eq(tables.id, id),
          eq(tables.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingTable.length) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Если меняется номер, проверить уникальность
    if (number && number !== existingTable[0].number) {
      const duplicateTable = await db
        .select()
        .from(tables)
        .where(
          and(
            eq(tables.restaurantId, session.user.restaurantId),
            eq(tables.number, number)
          )
        )
        .limit(1);

      if (duplicateTable.length > 0) {
        return NextResponse.json(
          { error: 'Table with this number already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (number !== undefined) updateData.number = number;
    if (description !== undefined) updateData.description = description;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (pin !== undefined) updateData.pin = pin;
    if (status !== undefined) updateData.status = status;

    const updatedTable = await db
      .update(tables)
      .set(updateData)
      .where(eq(tables.id, id))
      .returning();

    return NextResponse.json(updatedTable[0]);
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 });
  }
}

// DELETE - Удалить столик
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId || !['supervisor', 'admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    // Проверка, что столик принадлежит ресторану
    const existingTable = await db
      .select()
      .from(tables)
      .where(
        and(
          eq(tables.id, id),
          eq(tables.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingTable.length) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    await db.delete(tables).where(eq(tables.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
  }
}
