import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { loyaltyPrograms, loyaltyLevels } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Получить программу лояльности и её уровни
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
      where: eq(loyaltyPrograms.restaurantId, session.user.restaurantId),
      with: {
        levels: {
          orderBy: (loyaltyLevels, { asc }) => [asc(loyaltyLevels.minPoints)]
        }
      }
    });
    

    return NextResponse.json(program || null);
  } catch (error) {
    console.error('[Loyalty Settings GET] Error fetching loyalty program:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loyalty program' },
      { status: 500 }
    );
  }
}

// POST - Создать или обновить программу лояльности
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
      pointsPerRuble,
      isActive = true,
    } = body;

    // Валидация
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (pointsPerRuble && (parseFloat(pointsPerRuble) < 0 || parseFloat(pointsPerRuble) > 100)) {
      return NextResponse.json(
        { error: 'Points per ruble must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Проверяем, есть ли уже программа
    const existingProgram = await db.query.loyaltyPrograms.findFirst({
      where: eq(loyaltyPrograms.restaurantId, session.user.restaurantId)
    });

    let program;

    if (existingProgram) {
      // Обновляем существующую
      const updated = await db
        .update(loyaltyPrograms)
        .set({
          name,
          description: description || null,
          pointsPerRuble: pointsPerRuble?.toString() || '0.01',
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(loyaltyPrograms.id, existingProgram.id))
        .returning();
      
      program = updated[0];
    } else {
      // Создаем новую
      const created = await db
        .insert(loyaltyPrograms)
        .values({
          restaurantId: session.user.restaurantId,
          name,
          description: description || null,
          pointsPerRuble: pointsPerRuble?.toString() || '0.01',
          isActive,
          discountPercent: 0,
          minOrdersRequired: 0,
        })
        .returning();
      
      program = created[0];
    }

    return NextResponse.json(program);
  } catch (error) {
    console.error('[Loyalty Settings POST] Error saving loyalty program:', error);
    // Более подробное логирование
    if (error instanceof Error) {
      console.error('[Loyalty Settings POST] Error details:', error.message, error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to save loyalty program' },
      { status: 500 }
    );
  }
}
