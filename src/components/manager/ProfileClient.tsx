'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  phone: string | null;
  avatarUrl: string | null;
}

interface ProfileClientProps {
  user: User;
}

export default function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Форма профиля
  const [profileData, setProfileData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    middleName: user.middleName || '',
    email: user.email,
    phone: user.phone || '',
  });

  // Форма смены пароля
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      toast.success('Профиль обновлён');
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Ошибка обновления профиля');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${user.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }

      toast.success('Пароль изменён');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Ошибка смены пароля');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 5 МБ)');
      return;
    }

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`/api/users/${user.id}/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload avatar');

      toast.success('Аватар обновлён');
      router.refresh();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Ошибка загрузки аватара');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Личный кабинет</h1>
        <p className="mt-1 text-sm text-gray-600">
          Управление профилем и настройками
        </p>
      </div>

      {/* Аватар */}
      <Card className="mb-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-200">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl text-gray-400">
                  👤
                </div>
              )}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-900">Фотография профиля</h3>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploadingAvatar}
              />
              <span className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Загрузить фото
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              JPG, PNG до 5 МБ
            </p>
          </div>
        </div>
      </Card>

      {/* Основная информация */}
      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Основная информация</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Фамилия
              </label>
              <Input
                value={profileData.lastName}
                onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Иванов"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Имя
              </label>
              <Input
                value={profileData.firstName}
                onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Иван"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Отчество
              </label>
              <Input
                value={profileData.middleName}
                onChange={(e) => setProfileData(prev => ({ ...prev, middleName: e.target.value }))}
                placeholder="Иванович"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Телефон
            </label>
            <Input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} isLoading={isLoading}>
              Сохранить изменения
            </Button>
          </div>
        </div>
      </Card>

      {/* Безопасность */}
      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Безопасность</h2>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Пароль</h3>
            <p className="text-sm text-gray-600">Изменить пароль для входа</p>
          </div>
          <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
            Изменить пароль
          </Button>
        </div>
      </Card>

      {/* Выход */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Выход из системы</h3>
            <p className="text-sm text-gray-600">Завершить текущий сеанс</p>
          </div>
          <Button variant="danger" onClick={handleSignOut}>
            Выйти
          </Button>
        </div>
      </Card>

      {/* Модальное окно смены пароля */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => !isLoading && setShowPasswordModal(false)}
        title="Изменение пароля"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Текущий пароль
            </label>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Введите текущий пароль"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Новый пароль
            </label>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder="Минимум 6 символов"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Подтвердите новый пароль
            </label>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Повторите новый пароль"
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowPasswordModal(false)}
              disabled={isLoading}
            >
              Отмена
            </Button>
            <Button onClick={handleChangePassword} isLoading={isLoading}>
              Изменить пароль
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
