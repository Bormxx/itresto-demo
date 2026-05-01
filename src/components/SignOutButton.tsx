'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      // Выполняем logout через NextAuth без автоматического редиректа
      await signOut({ 
        redirect: false 
      });
      
      // Явно перенаправляем на главную страницу
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      // В случае ошибки всё равно пытаемся перенаправить
      router.push('/');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f4f6] text-[#000000] transition hover:bg-[#e5e7eb]"
      title="Выйти"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    </button>
  );
}
