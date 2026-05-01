'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useForm } from '@/hooks/useForm';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { Alert } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';

export function ClientRegisterForm({ restaurant }: { restaurant: string }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  const { values, errors, handleChange, handleSubmit, isSubmitting, setFieldError } = useForm({
    initialValues: {
      email: '',
      phone: '',
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

        <p className="mt-4 text-xs text-[#6b7280]">
          * Обязательные поля. Фамилия, имя, отчество и дата рождения
          можно будет указать позже в личном кабинете.
        </p>
      </div>
    </form>
  );
}
