import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { checkAuthRateLimit, getClientIp, createRateLimitResponse } from '@/lib/rateLimit';

// POST /api/auth/register - регистрация клиента
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 попыток в 15 минут с одного IP
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkAuthRateLimit(clientIp);
    
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const { email, phone } = body;

    // Валидация
    if (!email || !phone) {
      return NextResponse.json(
        { error: 'Email и телефон обязательны' },
        { status: 400 }
      );
    }

    if (phone.length < 6) {
      return NextResponse.json(
        { error: 'Телефон должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    // Проверка существующего пользователя
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    // Хеширование телефона (используется как пароль)
    const hashedPassword = await hash(phone, 10);

    // Создание клиента
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        phone,
        passwordHash: hashedPassword,
        role: 'client',
        restaurantId: null, // Клиент не привязан к ресторану
      })
      .returning();

    // Не возвращаем пароль
    const { passwordHash: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      { 
        message: 'Registration successful',
        user: userWithoutPassword 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
