'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const t = useTranslations('common');
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'pending' | 'error'>('pending');
  const [isVerifying, setIsVerifying] = useState(false);

  const orderId = searchParams.get('orderId');
  const locale = params.locale as string || 'ru';
  const restaurant = params.restaurant as string;

  useEffect(() => {
    if (!orderId) {
      setStatus('error');
      setIsLoading(false);
      return;
    }

    let pollCount = 0;
    const maxPolls = 15; // 15 * 2 секунды = 30 секунд
    let intervalId: NodeJS.Timeout;

    const checkOrderStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/status`);
        
        if (!response.ok) {
          throw new Error('Ошибка проверки статуса');
        }

        const data = await response.json();

        if (data.isPaid && data.isCompleted) {
          // Заказ оплачен и закрыт (webhook пришёл)
          setStatus('success');
          setIsLoading(false);
          clearInterval(intervalId);
          return;
        }

        pollCount++;

        // Если прошло 30 секунд, делаем fallback проверку через API платёжной системы
        if (pollCount >= maxPolls) {
          clearInterval(intervalId);
          await verifyPaymentManually();
        }
      } catch (error) {
        console.error('Error checking order status:', error);
        pollCount++;
        
        if (pollCount >= maxPolls) {
          clearInterval(intervalId);
          await verifyPaymentManually();
        }
      }
    };

    const verifyPaymentManually = async () => {
      setIsVerifying(true);
      
      try {
        const response = await fetch('/api/payments/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        const data = await response.json();

        if (data.success && data.status === 'paid') {
          setStatus('success');
        } else {
          // Платёж ещё не завершён
          setStatus('pending');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('error');
      } finally {
        setIsLoading(false);
        setIsVerifying(false);
      }
    };

    // Первая проверка сразу
    checkOrderStatus();

    // Затем проверяем каждые 2 секунды
    intervalId = setInterval(checkOrderStatus, 2000);

    return () => clearInterval(intervalId);
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {isVerifying ? 'Проверка статуса платежа' : 'Обработка платежа'}
          </h1>
          <p className="text-gray-600">
            {isVerifying 
              ? 'Связываемся с платёжной системой...' 
              : 'Пожалуйста, подождите. Обычно это занимает несколько секунд.'
            }
          </p>
          {!isVerifying && (
            <p className="mt-4 text-sm text-gray-500">
              Не закрывайте эту страницу
            </p>
          )}
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="mb-3 text-3xl font-bold text-gray-900">Оплата успешна!</h1>
          <p className="mb-6 text-gray-600">
            Ваш заказ оплачен. Спасибо!
          </p>

          {orderId && (
            <p className="mb-6 text-sm text-gray-500">
              ID заказа: {orderId.slice(0, 8)}...
            </p>
          )}

          <div className="space-y-3">
            <Link
              href={`/${locale}/${restaurant}`}
              className="block w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Вернуться в меню
            </Link>
            
            <Link
              href={`/${locale}/${restaurant}/reservations`}
              className="block w-full rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Мои заказы
            </Link>
          </div>

          <p className="mt-6 text-xs text-gray-500">
            Чек будет отправлен на вашу электронную почту
          </p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <svg className="h-10 w-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="mb-3 text-3xl font-bold text-gray-900">Платёж обрабатывается</h1>
          <p className="mb-6 text-gray-600">
            Платёж ещё не завершён. Это может занять несколько минут.
          </p>

          <div className="mb-6 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
            <p className="font-semibold mb-1">Что делать?</p>
            <p>Проверьте статус платежа в вашем банке или вернитесь на эту страницу позже.</p>
          </div>

          <div className="space-y-3">
            <Link
              href={`/${locale}/${restaurant}`}
              className="block w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              Вернуться в меню
            </Link>
            
            <button
              onClick={() => window.location.reload()}
              className="block w-full rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Проверить снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 className="mb-3 text-3xl font-bold text-gray-900">Ошибка оплаты</h1>
        <p className="mb-6 text-gray-600">
          Произошла ошибка при обработке платежа. Попробуйте снова.
        </p>

        <Link
          href={`/${locale}/${restaurant}`}
          className="block w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Вернуться в меню
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
