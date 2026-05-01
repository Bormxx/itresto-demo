import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { loyaltyPrograms, clientLoyalty, users } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';

// GET - Получить все программы лояльности ресторана
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const includeClients = searchParams.get('includeClients') === 'true';

    let query = db
      .select()
      .from(loyaltyPrograms)
      .where(eq(loyaltyPrograms.restaurantId, session.user.restaurantId))
      .orderBy(desc(loyaltyPrograms.minOrdersRequired));

    if (!includeInactive) {
      query = db
        .select()
        .from(loyaltyPrograms)
        .where(
          and(
            eq(loyaltyPrograms.restaurantId, session.user.restaurantId),
            eq(loyaltyPrograms.isActive, true)
          )
        )
        .orderBy(desc(loyaltyPrograms.minOrdersRequired));
    }

    const programs = await query;

    // Если запрошена информация о клиентах в программах
    if (includeClients) {
      const programsWithClients = await Promise.all(
        programs.map(async (program) => {
          const clients = await db
            .select({
              id: clientLoyalty.id,
              clientId: clientLoyalty.clientId,
              clientEmail: users.email,
              clientFirstName: users.firstName,
              clientLastName: users.lastName,
              orderCount: clientLoyalty.orderCount,
              totalSpent: clientLoyalty.totalSpent,
              currentDiscountPercent: clientLoyalty.currentDiscountPercent,
              joinedAt: clientLoyalty.joinedAt,
            })
            .from(clientLoyalty)
            .leftJoin(users, eq(clientLoyalty.clientId, users.id))
            .where(eq(clientLoyalty.loyaltyProgramId, program.id));

          return {
            ...program,
            clients,
            clientCount: clients.length,
          };
        })
      );

      return NextResponse.json(programsWithClients);
    }

    return NextResponse.json(programs);
  } catch (error) {
    console.error('Error fetching loyalty programs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loyalty programs' },
      { status: 500 }
    );
  }
}

// POST - Создать новую программу лояльности
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      discountPercent = 0,
      minOrdersRequired = 0,
      isActive = true,
    } = body;

    // Валидация
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json(
        { error: 'Discount percent must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (minOrdersRequired < 0) {
      return NextResponse.json(
        { error: 'Minimum orders required must be 0 or more' },
        { status: 400 }
      );
    }

    // Проверяем, не существует ли программа с таким же minOrdersRequired
    const existingPrograms = await db
      .select()
      .from(loyaltyPrograms)
      .where(
        and(
          eq(loyaltyPrograms.restaurantId, session.user.restaurantId),
          eq(loyaltyPrograms.minOrdersRequired, minOrdersRequired)
        )
      );

    if (existingPrograms.length > 0) {
      return NextResponse.json(
        { error: `Loyalty program with ${minOrdersRequired} minimum orders already exists` },
        { status: 400 }
      );
    }

    const newProgram = await db
      .insert(loyaltyPrograms)
      .values({
        restaurantId: session.user.restaurantId,
        name,
        description,
        discountPercent,
        minOrdersRequired,
        isActive,
      })
      .returning();

    return NextResponse.json(newProgram[0], { status: 201 });
  } catch (error) {
    console.error('Error creating loyalty program:', error);
    return NextResponse.json(
      { error: 'Failed to create loyalty program' },
      { status: 500 }
    );
  }
}

// PATCH - Обновить программу лояльности
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id,
      name,
      description,
      discountPercent,
      minOrdersRequired,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Program ID is required' },
        { status: 400 }
      );
    }

    // Проверяем, что программа принадлежит ресторану
    const existingProgram = await db
      .select()
      .from(loyaltyPrograms)
      .where(
        and(
          eq(loyaltyPrograms.id, id),
          eq(loyaltyPrograms.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingProgram || existingProgram.length === 0) {
      return NextResponse.json(
        { error: 'Loyalty program not found' },
        { status: 404 }
      );
    }

    // Валидация
    if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100)) {
      return NextResponse.json(
        { error: 'Discount percent must be between 0 and 100' },
        { status: 400 }
      );
    }

    if (minOrdersRequired !== undefined && minOrdersRequired < 0) {
      return NextResponse.json(
        { error: 'Minimum orders required must be 0 or more' },
        { status: 400 }
      );
    }

    // Если меняется minOrdersRequired, проверяем на дубликаты
    if (minOrdersRequired !== undefined && minOrdersRequired !== existingProgram[0].minOrdersRequired) {
      const duplicatePrograms = await db
        .select()
        .from(loyaltyPrograms)
        .where(
          and(
            eq(loyaltyPrograms.restaurantId, session.user.restaurantId),
            eq(loyaltyPrograms.minOrdersRequired, minOrdersRequired)
          )
        );

      if (duplicatePrograms.length > 0) {
        return NextResponse.json(
          { error: `Loyalty program with ${minOrdersRequired} minimum orders already exists` },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (discountPercent !== undefined) updateData.discountPercent = discountPercent;
    if (minOrdersRequired !== undefined) updateData.minOrdersRequired = minOrdersRequired;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedProgram = await db
      .update(loyaltyPrograms)
      .set(updateData)
      .where(
        and(
          eq(loyaltyPrograms.id, id),
          eq(loyaltyPrograms.restaurantId, session.user.restaurantId)
        )
      )
      .returning();

    return NextResponse.json(updatedProgram[0]);
  } catch (error) {
    console.error('Error updating loyalty program:', error);
    return NextResponse.json(
      { error: 'Failed to update loyalty program' },
      { status: 500 }
    );
  }
}

// DELETE - Удалить программу лояльности
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Program ID is required' },
        { status: 400 }
      );
    }

    // Проверяем, что программа принадлежит ресторану
    const existingProgram = await db
      .select()
      .from(loyaltyPrograms)
      .where(
        and(
          eq(loyaltyPrograms.id, id),
          eq(loyaltyPrograms.restaurantId, session.user.restaurantId)
        )
      )
      .limit(1);

    if (!existingProgram || existingProgram.length === 0) {
      return NextResponse.json(
        { error: 'Loyalty program not found' },
        { status: 404 }
      );
    }

    // Проверяем, есть ли клиенты в этой программе
    const clientsInProgram = await db
      .select()
      .from(clientLoyalty)
      .where(eq(clientLoyalty.loyaltyProgramId, id))
      .limit(1);

    if (clientsInProgram.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete loyalty program with active clients. Deactivate it instead.' },
        { status: 400 }
      );
    }

    await db
      .delete(loyaltyPrograms)
      .where(
        and(
          eq(loyaltyPrograms.id, id),
          eq(loyaltyPrograms.restaurantId, session.user.restaurantId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting loyalty program:', error);
    return NextResponse.json(
      { error: 'Failed to delete loyalty program' },
      { status: 500 }
    );
  }
}
