import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

// Create the intl middleware
const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Пропускаем API роуты
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Пропускаем редирект для демо
  if (pathname === '/demo') {
    return NextResponse.next();
  }

  // Apply intl middleware for locale handling
  const intlResponse = intlMiddleware(request);
  
  // Извлекаем locale и остальные части пути
  // URL structure: /[locale]/[restaurant]/[role?]/[...path]
  const pathParts = pathname.split('/').filter(Boolean);
  const locale = pathParts[0]; // ru, en, zh, etc
  const restaurantSlug = pathParts[1] ? decodeURIComponent(pathParts[1]) : undefined;
  const role = pathParts[2]; // waiter, kitchen, bar, manager, supervisor

  // Публичный маршрут для создания демо-ресторана
  if (restaurantSlug === 'demo' && role === 'create') {
    return intlResponse;
  }

  const session = await auth();

  // Публичные маршруты (клиентское меню и auth страницы)
  if (!role || role === 't' || role === 'auth' || role === 'profile' || role === 'reservations') {
    return intlResponse;
  }

  // Защищенные маршруты требуют авторизации
  if (!session?.user) {
    const signInUrl = new URL(`/${locale}/${restaurantSlug}/auth/signin`, request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Проверка прав доступа по ролям
  const userRole = session.user.role;
  const allowedRoles: Record<string, string[]> = {
    waiter: ['waiter', 'supervisor', 'admin'],
    kitchen: ['kitchen_staff', 'supervisor', 'admin'],
    bar: ['bar_staff', 'manager', 'supervisor', 'admin'],
    manager: ['manager', 'supervisor', 'admin'],
    supervisor: ['supervisor', 'admin'],
    admin: ['admin'],
  };

  // Проверяем, имеет ли пользователь доступ к запрашиваемой роли
  if (role in allowedRoles && !allowedRoles[role].includes(userRole)) {
    return NextResponse.redirect(new URL(`/${locale}/unauthorized`, request.url));
  }

  // Проверка, что пользователь принадлежит к нужному ресторану (кроме админа)
  if (userRole !== 'admin' && session.user.restaurantSlug !== restaurantSlug) {
    return NextResponse.redirect(new URL(`/${locale}/unauthorized`, request.url));
  }

  return intlResponse;
}

export const config = {
  matcher: [
    // Match all pathnames except for static files and api routes
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
