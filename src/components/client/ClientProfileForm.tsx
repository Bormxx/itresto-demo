'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useForm } from '@/hooks/useForm';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';
import { Alert } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';

interface User {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  dateOfBirth: Date | null;
}

interface ClientProfileFormProps {
  user: User;
  restaurant: string;
}

export function ClientProfileForm({ user, restaurant }: ClientProfileFormProps) {
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState('');

  const { values, errors, handleChange, handleSubmit, isSubmitting } = useForm({
    initialValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      middleName: user.middleName || '',
      dateOfBirth: user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split('T')[0]
        : '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    onSubmit: async (values) => {
      await apiClient.patch('/user/profile', values);
      
      setSuccess('Профиль успешно обновлён');
      setEditing(false);
      
      // Перезагрузить страницу через 1 секунду
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
  });

  const handleLogout = async () => {
    await signOut({ callbackUrl: `/${restaurant}` });
  };

  if (!editing) {
    return (
      <div className="rounded-lg bg-[#ffffff] p-6 shadow-sm">
        {success && <Alert variant="success" className="mb-4">{success}</Alert>}

        <div className="space-y-4">
          <div>
            <p className="text-sm text-[#4b5563]">Email</p>
            <p className="font-medium text-[#111827]">{user.email}</p>
          </div>

          <div>
            <p className="text-sm text-[#4b5563]">Телефон</p>
            <p className="font-medium text-[#111827]">{user.phone || 'Не указан'}</p>
          </div>

          <div>
            <p className="text-sm text-[#4b5563]">Фамилия</p>
            <p className="font-medium text-[#111827]">
              {user.lastName || 'Не указано'}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#4b5563]">Имя</p>
            <p className="font-medium text-[#111827]">
              {user.firstName || 'Не указано'}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#4b5563]">Отчество</p>
            <p className="font-medium text-[#111827]">
              {user.middleName || 'Не указано'}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#4b5563]">Дата рождения</p>
            <p className="font-medium text-[#111827]">
              {user.dateOfBirth
                ? new Date(user.dateOfBirth).toLocaleDateString('ru-RU')
                : 'Не указано'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button onClick={() => setEditing(true)} variant="primary">
            Редактировать
          </Button>
          <Button onClick={handleLogout} variant="secondary">
            Выйти
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-[#ffffff] p-6 shadow-sm">
      {errors.firstName && <Alert variant="error" className="mb-4">{errors.firstName}</Alert>}

      <div className="space-y-4">
        <div>
          <p className="mb-1 text-sm text-[#4b5563]">Email (не редактируется)</p>
          <p className="font-medium text-[#111827]">{user.email}</p>
        </div>

        <div>
          <p className="mb-1 text-sm text-[#4b5563]">Телефон (не редактируется)</p>
          <p className="font-medium text-[#111827]">{user.phone || 'Не указан'}</p>
        </div>

        <Input
          label="Фамилия"
          type="text"
          value={values.lastName}
          onChange={(e) => handleChange('lastName', e.target.value)}
          placeholder="Иванов"
        />

        <Input
          label="Имя"
          type="text"
          value={values.firstName}
          onChange={(e) => handleChange('firstName', e.target.value)}
          placeholder="Иван"
        />

        <Input
          label="Отчество"
          type="text"
          value={values.middleName}
          onChange={(e) => handleChange('middleName', e.target.value)}
          placeholder="Иванович"
        />

        <Input
          label="Дата рождения"
          type="date"
          value={values.dateOfBirth}
          onChange={(e) => handleChange('dateOfBirth', e.target.value)}
        />

        <div className="mt-6 border-t pt-6">
          <h3 className="mb-4 text-sm font-semibold text-[#111827]">Смена пароля (необязательно)</h3>
          
          <Input
            label="Текущий пароль"
            type="password"
            value={values.currentPassword}
            onChange={(e) => handleChange('currentPassword', e.target.value)}
            placeholder="Введите текущий пароль"
          />

          <Input
            label="Новый пароль"
            type="password"
            value={values.newPassword}
            onChange={(e) => handleChange('newPassword', e.target.value)}
            placeholder="Введите новый пароль"
          />

          <Input
            label="Подтверждение нового пароля"
            type="password"
            value={values.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            placeholder="Повторите новый пароль"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          Сохранить
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setEditing(false)}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}
