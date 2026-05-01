import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUserPrimaryRole } from '@/lib/userRoles';
import { encode } from 'next-auth/jwt';

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

/**
 * GET endpoint для WebView логина через URL параметр
 * Создаёт сессию и возвращает HTML с meta-refresh для редиректа
 * 
 * Использование: /api/mobile/auth/webview-login?token=xxx&redirect=/ru/demo/waiter
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const redirectPath = searchParams.get('redirect') || '/';

  try {
    if (!token) {
      throw new Error('No token provided');
    }

    // Верифицировать токен
    const payload = await verifyToken(token);
    
    if (!payload?.userId) {
      throw new Error('Invalid token');
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
      throw new Error('User not found');
    }

    // Получаем основную роль пользователя
    const primaryRole = await getUserPrimaryRole(user.id);

    // Создаём NextAuth session token используя встроенную функцию encode
    const secret = process.env.NEXTAUTH_SECRET || 'default-secret';
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = isProduction 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token';

    const sessionToken = await encode({
      token: {
        sub: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        role: primaryRole,
        restaurantId: user.restaurantId,
        restaurantSlug: user.restaurant?.slug || '',
      },
      secret,
      salt: cookieName,
      maxAge,
    });

    // HTML с редиректом после установки cookie через Set-Cookie заголовок
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting...</title>
    <style>
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: #f3f4f6;
        }
        .loader {
            text-align: center;
        }
        .spinner {
            border: 4px solid #e5e7eb;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loader">
        <div class="spinner"></div>
        <div id="status">Loading...</div>
    </div>
    <script>
        const statusEl = document.getElementById('status');
        const redirectPath = ${JSON.stringify(redirectPath)};
        const cookieName = ${JSON.stringify(cookieName)};
        
        statusEl.textContent = 'Session established...';
        
        
        // Отправляем сообщение в React Native для отладки
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'loginSuccess',
                cookieName: cookieName,
                redirectPath: redirectPath
            }));
        }
        
        statusEl.textContent = 'Redirecting...';
        
        // Редирект
        setTimeout(function() {
            window.location.href = redirectPath;
        }, 500);
    </script>
</body>
</html>
    `;

    // Формируем Set-Cookie заголовок
    const cookieOptions = [
      `${cookieName}=${sessionToken}`,
      'Path=/',
      `Max-Age=${maxAge}`,
      'SameSite=Lax',
    ];
    
    if (isProduction) {
      cookieOptions.push('Secure');
    }
    
    const setCookieHeader = cookieOptions.join('; ');
    

    // Возвращаем HTML с Set-Cookie заголовком
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': setCookieHeader,
      },
    });

  } catch (error) {
    console.error('WebView login error:', error);
    
    // Возвращаем HTML с сообщением для мобильного приложения об ошибке
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: #fef2f2;
            color: #991b1b;
            padding: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div>
        <h2>Authentication Error</h2>
        <p>Session creation failed. Please try logging in again.</p>
    </div>
    <script>
        // Отправляем сообщение в React Native WebView об ошибке
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
                type: 'loginError',
                error: 'Session creation failed'
            }));
        }
    </script>
</body>
</html>
    `;
    
    return new NextResponse(errorHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}
