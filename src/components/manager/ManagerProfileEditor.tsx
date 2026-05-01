'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface ManagerProfileEditorProps {
  userData: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    avatar: string | null;
  };
  restaurantSlug: string;
}

export function ManagerProfileEditor({ userData, restaurantSlug }: ManagerProfileEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    email: userData.email || '',
    phone: userData.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(userData.avatar);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      // Validate password fields
      if (formData.newPassword) {
        if (!formData.currentPassword) {
          setError('Введите текущий пароль для изменения пароля');
          setIsSaving(false);
          return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
          setError('Новые пароли не совпадают');
          setIsSaving(false);
          return;
        }
        if (formData.newPassword.length < 6) {
          setError('Новый пароль должен содержать минимум 6 символов');
          setIsSaving(false);
          return;
        }
      }

      const requestBody = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        currentPassword: formData.newPassword ? formData.currentPassword : undefined,
        newPassword: formData.newPassword || undefined,
      };

      const response = await fetch(`/api/manager/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при сохранении');
      }

      setSuccess('Профиль успешно обновлен');
      setIsEditing(false);
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#111827]">
          Данные профиля
        </h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-lg bg-[#10b981] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#059669]"
          >
            Редактировать
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-600">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar + Name Section */}
        <div className="flex gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="relative h-36 w-36 overflow-hidden rounded-full bg-[#f3f4f6]">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg className="h-16 w-16 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            {isEditing && (
              <p className="text-xs text-[#6b7280] mt-2 max-w-36">
                Загрузка аватара будет доступна позже
              </p>
            )}
          </div>

          {/* Name Fields */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                Имя
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                  required
                />
              ) : (
                <p className="text-[#111827] py-2">{userData.firstName || '—'}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#374151]">
                Фамилия
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                />
              ) : (
                <p className="text-[#111827] py-2">{userData.lastName || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[#374151]">
            Email
          </label>
          {isEditing ? (
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
              required
            />
          ) : (
            <p className="text-[#111827]">{userData.email || '—'}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[#374151]">
            Телефон
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
              placeholder="+7 (999) 123-45-67"
            />
          ) : (
            <p className="text-[#111827]">{userData.phone || '—'}</p>
          )}
        </div>

        {/* Password Change */}
        {isEditing && (
          <>
            <div className="border-t border-[#e5e7eb] pt-6">
              <h3 className="mb-4 text-lg font-medium text-[#111827]">
                Изменить пароль
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#374151]">
                    Текущий пароль
                  </label>
                  <input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    placeholder="Оставьте пустым, если не хотите менять"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#374151]">
                    Новый пароль
                  </label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    placeholder="Минимум 6 символов"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#374151]">
                    Подтвердите новый пароль
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    placeholder="Повторите новый пароль"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        {isEditing && (
          <div className="flex gap-3 border-t border-[#e5e7eb] pt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-lg bg-[#10b981] px-6 py-3 font-medium text-white transition hover:bg-[#059669] disabled:opacity-50"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  firstName: userData.firstName || '',
                  lastName: userData.lastName || '',
                  email: userData.email || '',
                  phone: userData.phone || '',
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                });
                setAvatarPreview(userData.avatar);
                setError(null);
                setSuccess(null);
              }}
              disabled={isSaving}
              className="rounded-lg bg-[#f3f4f6] px-6 py-3 font-medium text-[#111827] transition hover:bg-[#e5e7eb] disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
