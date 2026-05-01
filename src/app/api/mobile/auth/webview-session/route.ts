import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUserPrimaryRole } from '@/lib/userRoles';
import { hkdf } from '@panva/hkdf';

// Для JWT верификации мобильного токена
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'default-secret');

async function verifyToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

// Функция для создания ключа шифрования, точно как в NextAuth
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

/**
 * Endpoint для создания веб-сессии из мобильного JWT токена
 * Используется WebView в мобильном приложении
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Верифицировать токен
    const payload = await verifyToken(token);
    
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = payload.userId as string;

    // Получить данные пользователя
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        restaurant: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Получаем основную роль пользователя
    const primaryRole = await getUserPrimaryRole(user.id);

    // Параметры для создания NextAuth сессии
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token';
    const secret = process.env.NEXTAUTH_SECRET || 'default-secret';
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const alg = 'dir';
    const enc = 'A256CBC-HS512'; // NextAuth использует именно этот алгоритм
    
    // Получаем ключ шифрования точно так же, как это делает NextAuth
    const encryptionKey = await getDerivedEncryptionKey(enc, secret, cookieName);
    
    // Создаем thumbprint для kid
    const thumbprint = await jose.calculateJwkThumbprint(
      { kty: 'oct', k: jose.base64url.encode(encryptionKey) },
      'sha256' as const
    );
    
    // Создаем session token точно так же, как NextAuth
    const sessionToken = await new jose.EncryptJWT({
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

    // Создаём ответ с cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: primaryRole,
        restaurantId: user.restaurantId,
      },
    });
    
    // Устанавливаем cookie через NextResponse
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('WebView session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
