'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface PaymentSettingsClientProps {
  restaurantId: string;
}

export default function PaymentSettingsClient({ restaurantId }: PaymentSettingsClientProps) {
  const t = useTranslations('payments');
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const paymentProvider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || 'cloudpayments';
  const isCloudPayments = paymentProvider === 'cloudpayments';
  const isStripe = paymentProvider === 'stripe';

  // Загрузка существующих настроек
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/restaurants/${restaurantId}/payment-settings`);
        
        if (response.ok) {
          const data = await response.json();
          setPublicKey(data.publicKey || '');
          setSecretKey(data.secretKey || '');
        }
      } catch (error) {
        console.error('Failed to load payment settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!publicKey.trim() || !secretKey.trim()) {
      setMessage({ type: 'error', text: t('requiredFields') });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/payment-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: publicKey.trim(),
          secretKey: secretKey.trim(),
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: t('successMessage') });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || t('errorMessage') });
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: t('errorMessage') });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(var(--color-primary))]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-2 text-gray-600">{t('subtitle')}</p>
      </div>

      {/* Информация о провайдере */}
      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-900">{t('paymentProvider')}</h3>
        <p className="mt-1 text-sm text-blue-700">
          {isCloudPayments && t('cloudpaymentsDescription')}
          {isStripe && t('stripeDescription')}
        </p>
      </div>

      {/* Форма настроек */}
      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow">
        {/* Поле Public Key */}
        <div className="mb-4">
          <label htmlFor="publicKey" className="block text-sm font-medium text-gray-700">
            {isCloudPayments ? t('publicKey') : t('publishableKey')}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="publicKey"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder={isCloudPayments ? t('publicKeyPlaceholder') : t('publishableKeyPlaceholder')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-[#111827] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {/* Поле Secret Key */}
        <div className="mb-6">
          <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700">
            {isCloudPayments ? t('secretKey') : t('stripeSecretKey')}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="secretKey"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder={isCloudPayments ? t('secretKeyPlaceholder') : t('stripeSecretKeyPlaceholder')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-[#111827] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {/* Сообщения */}
        {message && (
          <div
            className={`mb-4 rounded-md p-3 ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Кнопка сохранения */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {isSaving ? t('savingButton') : t('saveButton')}
        </button>
      </form>

      {/* Инструкция */}
      <div className="mt-8 rounded-lg bg-white shadow">
        <button
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          className="flex w-full items-center justify-between p-6 text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">{t('instructionsTitle')}</h3>
          <svg
            className={`h-5 w-5 text-gray-500 transition-transform ${showInstructions ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showInstructions && (
          <div className="border-t border-gray-200 p-6">
            {isCloudPayments && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">
                  {t('instructionsCloudPayments.title')}
                </h4>
                <p className="text-sm text-gray-700">
                  {t('instructionsCloudPayments.step1')}{' '}
                  <a
                    href={t('instructionsCloudPayments.step1Link')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    CloudPayments
                  </a>
                </p>
                <p className="text-sm text-gray-700">{t('instructionsCloudPayments.step2')}</p>
                <p className="text-sm text-gray-700">{t('instructionsCloudPayments.step3')}</p>
                <p className="text-sm text-gray-700">{t('instructionsCloudPayments.step4')}</p>
                <p className="text-sm text-gray-700">{t('instructionsCloudPayments.step5')}</p>
                <p className="text-sm text-gray-700">{t('instructionsCloudPayments.step6')}</p>
              </div>
            )}

            {isStripe && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">
                  {t('instructionsStripe.title')}
                </h4>
                <p className="text-sm text-gray-700">
                  {t('instructionsStripe.step1')}{' '}
                  <a
                    href={t('instructionsStripe.step1Link')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Stripe
                  </a>
                </p>
                <p className="text-sm text-gray-700">{t('instructionsStripe.step2')}</p>
                <p className="text-sm text-gray-700">{t('instructionsStripe.step3')}</p>
                <p className="text-sm text-gray-700">{t('instructionsStripe.step4')}</p>
                <p className="text-sm text-gray-700">{t('instructionsStripe.step5')}</p>
                <p className="text-sm text-gray-700">{t('instructionsStripe.step6')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
