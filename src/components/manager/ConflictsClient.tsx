'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Checkbox from '@/components/ui/Checkbox';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

interface Conflict {
  id: string;
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  waiterName: string;
  customerName?: string;
  customerId?: string;
  description: string;
  discountType?: 'percent' | 'amount';
  discountValue?: number;
  status: 'open' | 'resolved';
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  tableNumber: string;
  waiterName: string;
  status: string;
}

interface ConflictsClientProps {
  restaurantId: string;
  userId: string;
}

export default function ConflictsClient({ restaurantId, userId }: ConflictsClientProps) {
  const t = useTranslations();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Форма
  const [formData, setFormData] = useState({
    orderId: '',
    description: '',
    discountType: 'percent' as 'percent' | 'amount',
    discountValue: 0,
    applyDiscount: false,
  });

  // Фильтры для выбора заказа
  const [orderFilters, setOrderFilters] = useState({
    tableNumber: '',
    waiterName: '',
  });

  useEffect(() => {
    fetchConflicts();
    fetchOpenOrders();
  }, [restaurantId]);

  const fetchConflicts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/manager/conflicts?restaurantId=${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch conflicts');
      
      const data = await response.json();
      setConflicts(Array.isArray(data.conflicts) ? data.conflicts : []);
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      toast.error('Ошибка загрузки конфликтов');
      setConflicts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOpenOrders = async () => {
    try {
      const response = await fetch(`/api/manager/orders?restaurantId=${restaurantId}&status=pending`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      setOpenOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOpenOrders([]);
    }
  };

  const handleAdd = () => {
    setSelectedConflict(null);
    setFormData({
      orderId: '',
      description: '',
      discountType: 'percent',
      discountValue: 0,
      applyDiscount: false,
    });
    setShowModal(true);
  };

  const handleEdit = (conflict: Conflict) => {
    setSelectedConflict(conflict);
    setFormData({
      orderId: conflict.orderId,
      description: conflict.description,
      discountType: conflict.discountType || 'percent',
      discountValue: conflict.discountValue || 0,
      applyDiscount: !!conflict.discountValue,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.orderId || !formData.description) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    if (formData.applyDiscount && formData.discountValue <= 0) {
      toast.error('Укажите размер скидки');
      return;
    }

    try {
      setIsSaving(true);
      const url = selectedConflict
        ? `/api/manager/conflicts/${selectedConflict.id}`
        : '/api/manager/conflicts';
      
      const method = selectedConflict ? 'PATCH' : 'POST';

      const body = {
        restaurantId,
        orderId: formData.orderId,
        description: formData.description,
        ...(formData.applyDiscount && {
          discountType: formData.discountType,
          discountValue: formData.discountValue,
        }),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to save conflict');

      toast.success(selectedConflict ? 'Конфликт обновлён' : 'Конфликт добавлен');
      setShowModal(false);
      fetchConflicts();
    } catch (error) {
      console.error('Error saving conflict:', error);
      toast.error('Ошибка сохранения конфликта');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredOrders = openOrders.filter(order => {
    if (orderFilters.tableNumber && !order.tableNumber.includes(orderFilters.tableNumber)) {
      return false;
    }
    if (orderFilters.waiterName && !order.waiterName.toLowerCase().includes(orderFilters.waiterName.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return <LoadingState message="Загрузка конфликтов..." />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Урегулирование конфликтов</h1>
          <p className="mt-1 text-sm text-gray-600">
            Решение спорных ситуаций и предоставление скидок
          </p>
        </div>
        <Button onClick={handleAdd}>Добавить</Button>
      </div>

      {conflicts.length === 0 ? (
        <EmptyState title="Нет конфликтных ситуаций" description="Добавьте запись о конфликте" />
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <Card
              key={conflict.id}
              hoverable
              onClick={() => handleEdit(conflict)}
              className="cursor-pointer"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="mb-1 font-semibold text-gray-900">
                    Заказ #{conflict.orderNumber} • Стол {conflict.tableNumber}
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(conflict.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
                <Badge variant={conflict.status === 'resolved' ? 'success' : 'warning'}>
                  {conflict.status === 'resolved' ? 'Решён' : 'Открыт'}
                </Badge>
              </div>

              <div className="mb-2 text-sm">
                <span className="font-medium">Официант:</span> {conflict.waiterName}
              </div>
              
              {conflict.customerName && (
                <div className="mb-2 text-sm">
                  <span className="font-medium">Клиент:</span> {conflict.customerName}
                  {conflict.customerId && <span className="text-gray-500"> (ID: {conflict.customerId})</span>}
                </div>
              )}

              <div className="mb-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                {conflict.description}
              </div>

              {conflict.discountValue && (
                <Badge variant="success">
                  Скидка: {conflict.discountType === 'percent' ? `${conflict.discountValue}%` : `${conflict.discountValue} ₽`}
                </Badge>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно добавления/редактирования */}
      <Modal
        isOpen={showModal}
        onClose={() => !isSaving && setShowModal(false)}
        title={selectedConflict ? 'Редактирование конфликта' : 'Добавление конфликта'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Выбор заказа */}
          {!selectedConflict && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Выберите заказ *
              </label>

              {/* Фильтры */}
              <div className="mb-3 grid grid-cols-2 gap-3">
                <Input
                  placeholder="Номер столика"
                  value={orderFilters.tableNumber}
                  onChange={(e) => setOrderFilters(prev => ({ ...prev, tableNumber: e.target.value }))}
                />
                <Input
                  placeholder="Официант"
                  value={orderFilters.waiterName}
                  onChange={(e) => setOrderFilters(prev => ({ ...prev, waiterName: e.target.value }))}
                />
              </div>

              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-3">
                {filteredOrders.map((order) => (
                  <label
                    key={order.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                      formData.orderId === order.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderId"
                      value={order.id}
                      checked={formData.orderId === order.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Заказ #{order.orderNumber}</div>
                      <div className="text-sm text-gray-600">
                        Стол {order.tableNumber} • {order.waiterName}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Описание */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Описание конфликтной ситуации *
            </label>
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Опишите суть проблемы..."
              disabled={selectedConflict?.status === 'resolved' && !selectedConflict}
            />
          </div>

          {/* Скидка */}
          {(!selectedConflict || selectedConflict.status !== 'resolved') && (
            <div>
              <label className="mb-3 flex items-center gap-2">
                <Checkbox
                  checked={formData.applyDiscount}
                  onChange={(e) => setFormData(prev => ({ ...prev, applyDiscount: e.target.checked }))}
                />
                <span className="text-sm font-medium text-gray-700">Применить скидку</span>
              </label>

              {formData.applyDiscount && (
                <div className="ml-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="discountType"
                        value="percent"
                        checked={formData.discountType === 'percent'}
                        onChange={() => setFormData(prev => ({ ...prev, discountType: 'percent' }))}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Скидка в %</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="discountType"
                        value="amount"
                        checked={formData.discountType === 'amount'}
                        onChange={() => setFormData(prev => ({ ...prev, discountType: 'amount' }))}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Скидка в деньгах</span>
                    </label>
                  </div>

                  <Input
                    type="number"
                    min="0"
                    max={formData.discountType === 'percent' ? 100 : undefined}
                    value={formData.discountValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                    placeholder={formData.discountType === 'percent' ? 'Процент скидки' : 'Сумма скидки в ₽'}
                  />
                </div>
              )}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={isSaving}>
              Отмена
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
