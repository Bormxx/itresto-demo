'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      // Очищаем localStorage для мобильного приложения (если в WebView)
      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
        localStorage.removeItem('authToken');
        // Сообщаем React Native о выходе
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'logout' }));
      }
      
      // Выполняем logout через NextAuth без автоматического редиректа
      await signOut({ 
        redirect: false 
      });
      
      // Явно перенаправляем на главную страницу
      router.push('/ru');
    } catch (error) {
      console.error('Logout error:', error);
      // В случае ошибки всё равно пытаемся перенаправить
      router.push('/ru');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="inline-flex items-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 font-medium text-white transition hover:bg-[#059669]"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Выйти из аккаунта
    </button>
  );
}
