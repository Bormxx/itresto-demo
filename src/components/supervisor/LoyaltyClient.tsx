'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/ui/Modal';
import DataTable from '@/components/supervisor/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string | null;
  discountPercent: number;
  minOrdersRequired: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clientCount?: number;
  clients?: ClientLoyalty[];
}

interface ClientLoyalty {
  id: string;
  clientId: string;
  clientEmail: string;
  clientFirstName: string;
  clientLastName: string;
  orderCount: number;
  totalSpent: string;
  currentDiscountPercent: number;
  joinedAt: string;
}

const initialFormData = {
  name: '',
  description: '',
  discountPercent: '',
  minOrdersRequired: '',
  isActive: true,
};

export default function LoyaltyClient() {
  const t = useTranslations('supervisor');
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<LoyaltyProgram | null>(null);
  const [deletingProgram, setDeletingProgram] = useState<LoyaltyProgram | null>(null);
  const [viewingProgram, setViewingProgram] = useState<LoyaltyProgram | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [includeClients, setIncludeClients] = useState(true);

  useEffect(() => {
    fetchPrograms();
  }, [includeInactive, includeClients]);

  const fetchPrograms = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/supervisor/loyalty?includeInactive=${includeInactive}&includeClients=${includeClients}`
      );
      if (!response.ok) throw new Error('Failed to fetch loyalty programs');
      const data = await response.json();
      setPrograms(data);
    } catch (error) {
      console.error('Error fetching loyalty programs:', error);
      setError('Failed to load loyalty programs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const url = '/api/supervisor/loyalty';
      const method = editingProgram ? 'PATCH' : 'POST';

      const payload: any = {
        name: formData.name,
        description: formData.description || null,
        discountPercent: parseInt(formData.discountPercent),
        minOrdersRequired: parseInt(formData.minOrdersRequired),
        isActive: formData.isActive,
      };

      if (editingProgram) {
        payload.id = editingProgram.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save program');
      }

      await fetchPrograms();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving program:', error);
      setError(error.message || 'Failed to save program');
    }
  };

  const handleDelete = async () => {
    if (!deletingProgram) return;

    try {
      const response = await fetch(`/api/supervisor/loyalty?id=${deletingProgram.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete program');
      }

      await fetchPrograms();
      setIsDeleteModalOpen(false);
      setDeletingProgram(null);
    } catch (error: any) {
      console.error('Error deleting program:', error);
      setError(error.message || 'Failed to delete program');
    }
  };

  const handleOpenModal = (program?: LoyaltyProgram) => {
    if (program) {
      setEditingProgram(program);
      setFormData({
        name: program.name,
        description: program.description || '',
        discountPercent: program.discountPercent.toString(),
        minOrdersRequired: program.minOrdersRequired.toString(),
        isActive: program.isActive,
      });
    } else {
      setEditingProgram(null);
      setFormData(initialFormData);
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProgram(null);
    setFormData(initialFormData);
    setError(null);
  };

  const handleOpenDeleteModal = (program: LoyaltyProgram) => {
    setDeletingProgram(program);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDetailsModal = (program: LoyaltyProgram) => {
    setViewingProgram(program);
    setIsDetailsModalOpen(true);
  };

  const handleToggleActive = async (program: LoyaltyProgram) => {
    try {
      const response = await fetch('/api/supervisor/loyalty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: program.id,
          isActive: !program.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update program');
      }

      await fetchPrograms();
    } catch (error: any) {
      console.error('Error updating program:', error);
      setError(error.message || 'Failed to update program');
    }
  };

  const columns = [
    { key: 'name', label: 'Название' },
    { 
      key: 'minOrdersRequired', 
      label: 'Мин. заказов',
      render: (program: LoyaltyProgram) => program.minOrdersRequired
    },
    { 
      key: 'discountPercent', 
      label: 'Скидка',
      render: (program: LoyaltyProgram) => `${program.discountPercent}%`
    },
    { 
      key: 'clientCount', 
      label: 'Клиентов',
      render: (program: LoyaltyProgram) => program.clientCount || 0
    },
    { 
      key: 'status', 
      label: 'Статус',
      render: (program: LoyaltyProgram) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          program.isActive 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-200 text-gray-700'
        }`}>
          {program.isActive ? 'Активна' : 'Неактивна'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Действия',
      render: (program: LoyaltyProgram) => (
        <div className="flex gap-2">
          <Button
            onClick={() => handleOpenDetailsModal(program)}
            variant="primary"
            size="sm"
          >
            Клиенты
          </Button>
          <Button
            onClick={() => handleToggleActive(program)}
            variant={program.isActive ? "secondary" : "success"}
            size="sm"
          >
            {program.isActive ? 'Деактивировать' : 'Активировать'}
          </Button>
          <Button
            onClick={() => handleOpenModal(program)}
            variant="primary"
            size="sm"
          >
            Изменить
          </Button>
          <Button
            onClick={() => handleOpenDeleteModal(program)}
            variant="danger"
            size="sm"
          >
            Удалить
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Программы лояльности</h1>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">Показать неактивные</span>
          </label>
          <Button onClick={() => handleOpenModal()}>
            Создать программу
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 underline"
          >
            Закрыть
          </button>
        </div>
      )}

      {programs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Нет созданных программ лояльности
        </div>
      ) : (
        <DataTable
          data={programs}
          columns={columns}
        />
      )}

      {/* Модальное окно создания/редактирования */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProgram ? 'Редактировать программу' : 'Создать программу'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Название программы *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: Серебряная карта"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              rows={3}
              placeholder="Описание программы и её преимуществ"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Минимум заказов *
              </label>
              <Input
                type="number"
                min="0"
                value={formData.minOrdersRequired}
                onChange={(e) => setFormData({ ...formData, minOrdersRequired: e.target.value })}
                placeholder="0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Сколько заказов нужно сделать для получения
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Скидка (%) *
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.discountPercent}
                onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
                placeholder="0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Процент скидки по этой программе
              </p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Активна</span>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={handleCloseModal}
              variant="secondary"
            >
              Отмена
            </Button>
            <Button type="submit">
              {editingProgram ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно подтверждения удаления */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Подтвердите удаление"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Вы уверены, что хотите удалить программу{' '}
            <strong>{deletingProgram?.name}</strong>?
          </p>
          {deletingProgram && deletingProgram.clientCount! > 0 && (
            <p className="text-sm text-red-600">
              В этой программе {deletingProgram.clientCount} клиентов. Вы не сможете удалить программу с активными клиентами. Деактивируйте её вместо этого.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setIsDeleteModalOpen(false)}
              variant="secondary"
            >
              Отмена
            </Button>
            <Button
              onClick={handleDelete}
              variant="danger"
              disabled={deletingProgram ? (deletingProgram.clientCount || 0) > 0 : false}
            >
              Удалить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно с клиентами программы */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={`Клиенты программы: ${viewingProgram?.name}`}
      >
        <div className="space-y-4">
          {viewingProgram?.clients && viewingProgram.clients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Заказов</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Потрачено</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Скидка</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Присоединился</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {viewingProgram.clients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-4 py-2 text-sm">
                        {client.clientFirstName} {client.clientLastName}
                      </td>
                      <td className="px-4 py-2 text-sm">{client.clientEmail}</td>
                      <td className="px-4 py-2 text-sm">{client.orderCount}</td>
                      <td className="px-4 py-2 text-sm">{parseFloat(client.totalSpent).toFixed(2)} ₽</td>
                      <td className="px-4 py-2 text-sm">{client.currentDiscountPercent}%</td>
                      <td className="px-4 py-2 text-sm">
                        {new Date(client.joinedAt).toLocaleDateString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              В этой программе пока нет клиентов
            </p>
          )}
          <div className="flex justify-end pt-4">
            <Button onClick={() => setIsDetailsModalOpen(false)}>
              Закрыть
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
