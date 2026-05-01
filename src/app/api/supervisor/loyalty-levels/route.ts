import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { loyaltyPrograms, loyaltyLevels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { logCreate, logUpdate, logDelete } from '@/lib/auditLog';
import { checkWriteRateLimit, getClientIp, createRateLimitResponse } from '@/lib/rateLimit';

// GET - Получить все уровни программы лояльности
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    // Получаем программу лояльности ресторана
    const program = await db.query.loyaltyPrograms.findFirst({
      where: eq(loyaltyPrograms.restaurantId, session.user.restaurantId)
    });

    if (!program) {
      return NextResponse.json([]);
    }

    // Получаем уровни
    const levels = await db.query.loyaltyLevels.findMany({
      where: eq(loyaltyLevels.loyaltyProgramId, program.id),
      orderBy: (loyaltyLevels, { asc }) => [asc(loyaltyLevels.minPoints)]
    });

    return NextResponse.json(levels);
  } catch (error) {
    console.error('Error fetching loyalty levels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loyalty levels' },
      { status: 500 }
    );
  }
}

// POST - Создать новый уровень
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const session = await auth();
    
    if (!session?.user?.restaurantId) {
      return NextResponse.json(
        { error: 'Not authenticated or no restaurant assigned' },
        { status: 401 }
      );
    }

    // Получаем программу лояльности ресторана
    const program = await db.query.loyaltyPrograms.findFirst({
      where: eq(loyaltyPrograms.restaurantId, session.user.restaurantId)
    });

    if (!program) {
      return NextResponse.json(
        { error: 'Loyalty program not found. Please create a program first.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      minPoints,
      discountPercent,
    } = body;

    // Валидация
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (minPoints === undefined || minPoints < 0) {
      return NextResponse.json(
        { error: 'Minimum points must be a positive number' },
        { status: 400 }
      );
    }

    if (discountPercent === undefined || discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json(
        { error: 'Discount percent must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Создаем уровень
    const newLevel = await db
      .insert(loyaltyLevels)
      .values({
        loyaltyProgramId: program.id,
        name,
        minPoints: parseInt(minPoints),
        discountPercent: parseInt(discountPercent),
      })
      .returning();

    // Audit log
    await logCreate(
      'loyalty_level',
      newLevel[0].id,
      {
        name: newLevel[0].name,
        minPoints: newLevel[0].minPoints,
        discountPercent: newLevel[0].discountPercent,
      },
      session.user.id,
      session.user.restaurantId
    );

    return NextResponse.json(newLevel[0], { status: 201 });
  } catch (error) {
    console.error('Error creating loyalty level:', error);
    return NextResponse.json(
      { error: 'Failed to create loyalty level' },
      { status: 500 }
    );
  }
}

// PATCH - Обновить уровень
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

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
      minPoints,
      discountPercent,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Level ID is required' },
        { status: 400 }
      );
    }

    // Проверяем, что уровень принадлежит программе ресторана
    const program = await db.query.loyaltyPrograms.findFirst({
      where: eq(loyaltyPrograms.restaurantId, session.user.restaurantId)
    });

    if (!program) {
      return NextResponse.json(
        { error: 'Loyalty program not found' },
        { status: 404 }
      );
    }

    const existingLevel = await db.query.loyaltyLevels.findFirst({
      where: and(
        eq(loyaltyLevels.id, id),
        eq(loyaltyLevels.loyaltyProgramId, program.id)
      )
    });

    if (!existingLevel) {
      return NextResponse.json(
        { error: 'Level not found' },
        { status: 404 }
      );
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (minPoints !== undefined) updateData.minPoints = parseInt(minPoints);
    if (discountPercent !== undefined) updateData.discountPercent = parseInt(discountPercent);

    const updatedLevel = await db
      .update(loyaltyLevels)
      .set(updateData)
      .where(eq(loyaltyLevels.id, id))
      .returning();

    // Audit log
    await logUpdate(
      'loyalty_level',
      id,
      {
        name: existingLevel.name,
        minPoints: existingLevel.minPoints,
        discountPercent: existingLevel.discountPercent,
      },
      {
        name: updatedLevel[0].name,
        minPoints: updatedLevel[0].minPoints,
        discountPercent: updatedLevel[0].discountPercent,
      },
      session.user.id,
      session.user.restaurantId
    );

    return NextResponse.json(updatedLevel[0]);
  } catch (error) {
    console.error('Error updating loyalty level:', error);
    return NextResponse.json(
      { error: 'Failed to update loyalty level' },
      { status: 500 }
    );
  }
}

// DELETE - Удалить уровень
export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting: 20 запросов в минуту
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkWriteRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

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
        { error: 'Level ID is required' },
        { status: 400 }
      );
    }

    // Проверяем, что уровень принадлежит программе ресторана
    const program = await db.query.loyaltyPrograms.findFirst({
      where: eq(loyaltyPrograms.restaurantId, session.user.restaurantId)
    });

    if (!program) {
      return NextResponse.json(
        { error: 'Loyalty program not found' },
        { status: 404 }
      );
    }

    const existingLevel = await db.query.loyaltyLevels.findFirst({
      where: and(
        eq(loyaltyLevels.id, id),
        eq(loyaltyLevels.loyaltyProgramId, program.id)
      )
    });

    if (!existingLevel) {
      return NextResponse.json(
        { error: 'Level not found' },
        { status: 404 }
      );
    }

    await db.delete(loyaltyLevels).where(eq(loyaltyLevels.id, id));

    // Audit log
    await logDelete(
      'loyalty_level',
      id,
      {
        name: existingLevel.name,
        minPoints: existingLevel.minPoints,
        discountPercent: existingLevel.discountPercent,
      },
      session.user.id,
      session.user.restaurantId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting loyalty level:', error);
    return NextResponse.json(
      { error: 'Failed to delete loyalty level' },
      { status: 500 }
    );
  }
}
