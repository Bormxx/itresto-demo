'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useForm } from '@/hooks/useForm';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { Alert } from '@/components/ui';

export function ClientLoginForm({ restaurant }: { restaurant: string }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  const { values, errors, handleChange, handleSubmit, isSubmitting, setFieldError } = useForm({
    initialValues: {
      email: '',
      phone: '',
    },
    onSubmit: async (values) => {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.phone,
        redirect: false,
      });

      if (result?.error) {
        setFieldError('email', 'Неверный email или телефон');
        throw new Error('Auth failed');
      }

      // Удаляем guest-id после успешной авторизации
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

      // Redirect на главную страницу ресторана или на сохранённый URL
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
          label="Email"
          type="email"
          value={values.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="your@email.com"
          required
        />

        <div className="mt-4">
          <Input
            label="Телефон"
            type="tel"
            value={values.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+7 (999) 123-45-67"
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="mt-6 w-full"
        >
          Войти
        </Button>
      </div>
    </form>
  );
}
