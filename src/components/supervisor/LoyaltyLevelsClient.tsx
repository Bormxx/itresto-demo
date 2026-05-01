'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from '@/lib/toast';
import { CardSkeleton, PageHeaderSkeleton } from '@/components/ui/Skeleton';

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string | null;
  pointsPerRuble: string;
  isActive: boolean;
  levels?: LoyaltyLevel[];
}

interface LoyaltyLevel {
  id: string;
  name: string;
  minPoints: number;
  discountPercent: number;
}

export default function LoyaltyLevelsClient() {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [levels, setLevels] = useState<LoyaltyLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Модальные окна
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Редактирование
  const [editingLevel, setEditingLevel] = useState<LoyaltyLevel | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<LoyaltyLevel | null>(null);
  
  // Формы
  const [programForm, setProgramForm] = useState({
    name: 'Программа лояльности',
    description: '',
    pointsPerRuble: '0.01',
    isActive: true,
  });

  const [levelForm, setLevelForm] = useState({
    name: '',
    minPoints: '',
    discountPercent: '',
  });

  useEffect(() => {
    fetchProgram();
  }, []);

  const fetchProgram = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/supervisor/loyalty-settings');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data) {
          setProgram(data);
          setLevels(data.levels || []);
          setProgramForm({
            name: data.name,
            description: data.description || '',
            pointsPerRuble: data.pointsPerRuble,
            isActive: data.isActive,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching program:', error);
      setError('Ошибка при загрузке программы лояльности');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      
      const response = await fetch('/api/supervisor/loyalty-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(programForm),
      });


      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LoyaltyLevelsClient] Error response text:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Ошибка при сохранении');
        } catch (parseError) {
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      
      await fetchProgram();
      setIsProgramModalOpen(false);
      toast.success('Программа лояльности сохранена', 'Настройки успешно обновлены');
    } catch (error: any) {
      console.error('[LoyaltyLevelsClient] Error saving program:', error);
      toast.error('Ошибка при сохранении', error.message || 'Не удалось сохранить программу лояльности');
      setError(error.message || 'Ошибка при сохранении программы');
    }
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const url = '/api/supervisor/loyalty-levels';
      const method = editingLevel ? 'PATCH' : 'POST';
      
      const payload: any = {
        name: levelForm.name,
        minPoints: parseInt(levelForm.minPoints),
        discountPercent: parseInt(levelForm.discountPercent),
      };

      if (editingLevel) {
        payload.id = editingLevel.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при сохранении');
      }

      await fetchProgram();
      handleCloseLevelModal();
      toast.success(
        editingLevel ? 'Уровень обновлён' : 'Уровень создан',
        `Уровень "${levelForm.name}" успешно ${editingLevel ? 'обновлён' : 'создан'}`
      );
    } catch (error: any) {
      console.error('Error saving level:', error);
      toast.error('Ошибка при сохранении', error.message || 'Не удалось сохранить уровень');
      setError(error.message || 'Ошибка при сохранении уровня');
    }
  };

  const handleDeleteLevel = async () => {
    if (!deletingLevel) return;

    try {
      const response = await fetch(`/api/supervisor/loyalty-levels?id=${deletingLevel.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при удалении');
      }

      await fetchProgram();
      setIsDeleteModalOpen(false);
      setDeletingLevel(null);
      toast.success('Уровень удалён', `Уровень "${deletingLevel.name}" успешно удалён`);
    } catch (error: any) {
      console.error('Error deleting level:', error);
      setError(error.message || 'Ошибка при удалении уровня');
    }
  };

  const handleOpenLevelModal = (level?: LoyaltyLevel) => {
    if (level) {
      setEditingLevel(level);
      setLevelForm({
        name: level.name,
        minPoints: level.minPoints.toString(),
        discountPercent: level.discountPercent.toString(),
      });
    } else {
      setEditingLevel(null);
      setLevelForm({
        name: '',
        minPoints: '',
        discountPercent: '',
      });
    }
    setError(null);
    setIsLevelModalOpen(true);
  };

  const handleCloseLevelModal = () => {
    setIsLevelModalOpen(false);
    setEditingLevel(null);
    setLevelForm({
      name: '',
      minPoints: '',
      discountPercent: '',
    });
    setError(null);
  };

  const handleOpenDeleteModal = (level: LoyaltyLevel) => {
    setDeletingLevel(level);
    setIsDeleteModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <CardSkeleton />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Уровни программы лояльности
        </h1>
        <p className="text-gray-600">
          Настройте формулу начисления баллов и уровни программы лояльности для клиентов
        </p>
      </div>

      {/* Блок настроек программы */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Настройки программы</h2>
          <Button onClick={() => setIsProgramModalOpen(true)}>
            {program ? 'Изменить настройки' : 'Создать программу'}
          </Button>
        </div>

        {program ? (
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-600">Название: </span>
              <span className="text-gray-900">{program.name}</span>
            </div>
            {program.description && (
              <div>
                <span className="text-sm font-medium text-gray-600">Описание: </span>
                <span className="text-gray-900">{program.description}</span>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-gray-600">Формула начисления: </span>
              <span className="text-gray-900">
                {program.pointsPerRuble} баллов за 1 рубль
              </span>
              <span className="text-sm text-gray-500 ml-2">
                (например, за заказ на 2000₽ = {Math.floor(2000 * parseFloat(program.pointsPerRuble))} баллов)
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Статус: </span>
              <span className={`px-2 py-1 rounded text-sm ${
                program.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {program.isActive ? 'Активна' : 'Неактивна'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">
            Программа лояльности еще не создана. Создайте программу для начала работы.
          </p>
        )}
      </div>

      {/* Блок уровней */}
      {program && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Уровни лояльности</h2>
            <Button onClick={() => handleOpenLevelModal()}>
              Добавить уровень
            </Button>
          </div>

          {levels.length > 0 ? (
            <div className="space-y-3">
              {levels.map((level) => (
                <div
                  key={level.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{level.name}</h3>
                    <p className="text-sm text-gray-600">
                      Минимум баллов: <span className="font-medium">{level.minPoints}</span>
                      {' • '}
                      Скидка: <span className="font-medium">{level.discountPercent}%</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenLevelModal(level)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(level)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">
              Уровни еще не созданы. Добавьте первый уровень.
            </p>
          )}
        </div>
      )}

      {/* Модальное окно настроек программы */}
      <Modal
        isOpen={isProgramModalOpen}
        onClose={() => setIsProgramModalOpen(false)}
        title={program ? 'Изменить программу лояльности' : 'Создать программу лояльности'}
      >
        <form onSubmit={handleSaveProgram} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Название программы *
            </label>
            <Input
              type="text"
              value={programForm.name}
              onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Описание
            </label>
            <textarea
              value={programForm.description}
              onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Формула начисления баллов *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={programForm.pointsPerRuble}
              onChange={(e) => setProgramForm({ ...programForm, pointsPerRuble: e.target.value })}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Количество баллов за 1 рубль. Например, 0.01 означает 1 балл за 100 рублей
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={programForm.isActive}
              onChange={(e) => setProgramForm({ ...programForm, isActive: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Программа активна
            </label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" onClick={() => setIsProgramModalOpen(false)} variant="secondary">
              Отмена
            </Button>
            <Button type="submit">
              {program ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно уровня */}
      <Modal
        isOpen={isLevelModalOpen}
        onClose={handleCloseLevelModal}
        title={editingLevel ? 'Изменить уровень' : 'Добавить уровень'}
      >
        <form onSubmit={handleSaveLevel} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Название уровня *
            </label>
            <Input
              type="text"
              value={levelForm.name}
              onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
              placeholder="Например: Бронза, Серебро, Золото"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Минимум баллов для достижения *
            </label>
            <Input
              type="number"
              min="0"
              value={levelForm.minPoints}
              onChange={(e) => setLevelForm({ ...levelForm, minPoints: e.target.value })}
              placeholder="Например: 200"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Количество баллов, необходимое для достижения этого уровня
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Процент скидки *
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={levelForm.discountPercent}
              onChange={(e) => setLevelForm({ ...levelForm, discountPercent: e.target.value })}
              placeholder="Например: 5"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Скидка для клиентов на этом уровне (от 0 до 100%)
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" onClick={handleCloseLevelModal} variant="secondary">
              Отмена
            </Button>
            <Button type="submit">
              {editingLevel ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Модальное окно удаления */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Удалить уровень"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Вы уверены, что хотите удалить уровень &quot;{deletingLevel?.name}&quot;?
          </p>
          <p className="text-sm text-gray-600">
            Это действие нельзя отменить.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              variant="secondary"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleDeleteLevel}
              className="bg-red-500 hover:bg-red-600"
            >
              Удалить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
