'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useForm } from '@/hooks/useForm';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { Alert } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { OfertaGuestsModal } from './OfertaGuestsModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

export function ClientRegisterForm({ restaurant }: { restaurant: string }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showOfertaModal, setShowOfertaModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const { values, errors, handleChange, handleSubmit, isSubmitting, setFieldError } = useForm({
    initialValues: {
      email: '',
      phone: '',
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!agreedToTerms) {
        errors.terms = 'Необходимо принять условия оферты и политику конфиденциальности';
      }
      return errors;
    },
    onSubmit: async (values) => {
      // Регистрация
      const data = await apiClient.post('/api/auth/register', values, { showToast: false });

      if (!data) {
        setFieldError('email', 'Ошибка регистрации');
        throw new Error('Registration failed');
      }

      // Автоматический вход после регистрации (используем телефон как пароль)
      const signInResult = await signIn('credentials', {
        email: values.email,
        password: values.phone,
        redirect: false,
      });

      if (signInResult?.error) {
        setFieldError('email', 'Регистрация успешна, но не удалось войти');
        throw new Error('Auto sign-in failed');
      }

      // Удаляем guest-id после успешной регистрации и входа
      const deviceUuid = localStorage.getItem('itresto-guest-id');
      if (deviceUuid) {
        try {
          const response = await fetch('/api/guest/link-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceUuid }),
          });
          
          localStorage.removeItem('itresto-guest-id');
          
          if (!response.ok) {
          }
        } catch (err) {
          console.error('Failed to link guest account:', err);
          localStorage.removeItem('itresto-guest-id');
        }
      }

      // Redirect на сохранённый URL или главную страницу ресторана
      window.location.href = redirect || `/${restaurant}`;
    },
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-[#ffffff] p-6 shadow-xl">
        {errors.email && (
          <Alert variant="error" className="mb-4">
            {errors.email}
          </Alert>
        )}

        <Input
          label="Email *"
          type="email"
          value={values.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="your@email.com"
          required
        />

        <div className="mt-4">
          <Input
            label="Телефон *"
            type="tel"
            value={values.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+7 (999) 123-45-67"
            required
            minLength={6}
            hint="Телефон будет использован для входа в систему"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="mt-6 w-full"
        >
          Зарегистрироваться
        </Button>

        <div className="mt-4">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-[#6b7280]">
              Я принимаю условия{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowOfertaModal(true);
                }}
                className="text-[#2563eb] underline hover:no-underline"
              >
                публичной оферты
              </button>
              {' '}и{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowPrivacyModal(true);
                }}
                className="text-[#2563eb] underline hover:no-underline"
              >
                политики конфиденциальности
              </button>
            </span>
          </label>
          {errors.terms && (
            <p className="mt-1 text-sm text-red-600">{errors.terms}</p>
          )}
        </div>

        <p className="mt-4 text-xs text-[#6b7280]">
          * Обязательные поля. Фамилия, имя, отчество и дата рождения
          можно будет указать позже в личном кабинете.
        </p>
      </div>

      <OfertaGuestsModal
        isOpen={showOfertaModal}
        onClose={() => setShowOfertaModal(false)}
      />
      
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </form>
  );
}
