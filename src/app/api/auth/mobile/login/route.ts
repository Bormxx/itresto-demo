/**
 * API endpoint для авторизации мобильного приложения
 * POST /api/auth/mobile/login
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { SignJWT, EncryptJWT } from 'jose';
import { getUserPrimaryRole } from '@/lib/userRoles';
import { hkdf } from '@panva/hkdf';

// Функция для создания ключа шифрования NextAuth
async function getDerivedEncryptionKey(enc: string, keyMaterial: string | Uint8Array, salt: string) {
  let length: number;
  switch (enc) {
    case "A256CBC-HS512":
      length = 64;
      break;
    case "A256GCM":
      length = 32;
      break;
    default:
      throw new Error("Unsupported JWT Content Encryption Algorithm");
  }
  return await hkdf(
    "sha256", 
    keyMaterial, 
    salt, 
    `Auth.js Generated Encryption Key (${salt})`, 
    length
  );
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Найти пользователя
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        restaurant: true,
      },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Проверить пароль
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Проверить роль (только официанты, менеджеры и супервайзеры)
    const allowedRoles = ['waiter', 'manager', 'supervisor', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Получаем основную роль пользователя
    const primaryRole = await getUserPrimaryRole(user.id);

    // Создать JWT токен для мобильного приложения
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || 'default-secret'
    );

    const mobileToken = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: primaryRole,
      restaurantId: user.restaurantId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d') // Токен на 30 дней
      .sign(secret);

    // Создать NextAuth session token для WebView
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token';
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const alg = 'dir';
    const enc = 'A256CBC-HS512';
    
    // Получаем ключ шифрования
    const encryptionKey = await getDerivedEncryptionKey(enc, process.env.NEXTAUTH_SECRET || 'default-secret', cookieName);
    
    // Создаем thumbprint для kid
    const thumbprint = await (await import('jose')).calculateJwkThumbprint(
      { kty: 'oct', k: (await import('jose')).base64url.encode(encryptionKey) },
      'sha256' as const
    );
    
    // Создаем session token
    const sessionToken = await new EncryptJWT({
      sub: user.id,
      email: user.email,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      role: primaryRole,
      restaurantId: user.restaurantId,
      restaurantSlug: user.restaurant?.slug || '',
    })
      .setProtectedHeader({ alg, enc, kid: thumbprint })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + maxAge)
      .setJti(crypto.randomUUID())
      .encrypt(encryptionKey);

    return NextResponse.json({
      success: true,
      token: mobileToken,
      sessionToken: sessionToken,
      cookieName: cookieName,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: primaryRole,
        restaurantId: user.restaurantId,
        restaurantSlug: user.restaurant?.slug || '',
      },
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
