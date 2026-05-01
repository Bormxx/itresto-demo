'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';

interface Order {
  id: string;
  tableNumber: string;
  orderNumber: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  waiterName?: string;
  customerId?: string;
  customerName?: string;
  items?: OrderItem[];
  discounts?: Discount[];
  billType?: 'shared' | 'separate';
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: string;
  discountedPrice?: string;
  total: string;
  discountedTotal?: string;
}

interface Discount {
  name: string;
  percent: number;
}

interface CurrentShift {
  id: string;
  startedAt: string;
  endedAt: string | null;
}

interface OrdersViewClientProps {
  restaurantId: string;
  currentShift: CurrentShift | null;
}

export default function OrdersViewClient({ restaurantId, currentShift }: OrdersViewClientProps) {
  const t = useTranslations();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  // Генерация списка часов смены
  const shiftHours = useMemo(() => {
    if (!currentShift) {
      // Если смены нет, генерируем часы текущего дня
      const hours: string[] = [];
      for (let i = 0; i < 24; i++) {
        hours.push(`${i.toString().padStart(2, '0')}:00`);
      }
      return hours;
    }
    
    const start = new Date(currentShift.startedAt);
    const end = currentShift.endedAt ? new Date(currentShift.endedAt) : new Date();
    
    const hours: string[] = [];
    const current = new Date(start);
    current.setMinutes(0, 0, 0);
    
    while (current <= end) {
      hours.push(current.toTimeString().slice(0, 5)); // HH:MM format
      current.setHours(current.getHours() + 1);
    }
    
    return hours;
  }, [currentShift]);
  
  // Фильтры
  const [filters, setFilters] = useState({
    orderNumber: '',
    tableNumber: '',
    waiterName: '',
    timeFrom: '',
    duration: '1',
  });

  // Устанавливаем начальное значение timeFrom при загрузке
  useEffect(() => {
    if (shiftHours.length > 0 && !filters.timeFrom) {
      setFilters(prev => ({ ...prev, timeFrom: shiftHours[0] }));
    }
  }, [shiftHours]);

  useEffect(() => {
    fetchOrders();
  }, [restaurantId]);

  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        restaurantId,
      });
      
      if (currentShift) {
        queryParams.append('shiftId', currentShift.id);
      }
      
      const response = await fetch(`/api/manager/orders?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Ошибка загрузки заказов');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (filters.orderNumber) {
      filtered = filtered.filter(o => 
        o.orderNumber.toLowerCase().includes(filters.orderNumber.toLowerCase())
      );
    }

    if (filters.tableNumber) {
      filtered = filtered.filter(o => 
        o.tableNumber.includes(filters.tableNumber)
      );
    }

    if (filters.waiterName) {
      filtered = filtered.filter(o => 
        o.waiterName?.toLowerCase().includes(filters.waiterName.toLowerCase())
      );
    }

    // Фильтр по времени с продолжительностью
    if (filters.timeFrom && filters.duration) {
      filtered = filtered.filter(o => {
        const orderDate = new Date(o.createdAt);
        const orderTime = orderDate.toTimeString().slice(0, 5);
        
        // Парсим время начала
        const [fromHour, fromMinute] = filters.timeFrom.split(':').map(Number);
        const fromDate = new Date(orderDate);
        fromDate.setHours(fromHour, fromMinute, 0, 0);
        
        // Вычисляем время окончания с учетом продолжительности
        const toDate = new Date(fromDate);
        toDate.setHours(toDate.getHours() + parseInt(filters.duration));
        
        return orderDate >= fromDate && orderDate < toDate;
      });
    }

    // Сортировка: незакрытые сверху, затем по времени
    filtered.sort((a, b) => {
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setFilteredOrders(filtered);
  };

  const handleOrderClick = async (order: Order) => {
    try {
      // Загружаем полную информацию о заказе
      const response = await fetch(`/api/manager/orders/${order.id}`);
      if (!response.ok) throw new Error('Failed to fetch order details');
      
      const fullOrder = await response.json();
      setSelectedOrder(fullOrder);
      setShowOrderModal(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast.error('Ошибка загрузки заказа');
    }
  };

  const resetFilters = () => {
    setFilters({
      orderNumber: '',
      tableNumber: '',
      waiterName: '',
      timeFrom: shiftHours[0] || '',
      duration: '1',
    });
  };

  if (isLoading) {
    return <LoadingState message="Загрузка заказов..." />;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Просмотр заказов</h1>
        <p className="mt-1 text-sm text-gray-600">
          Контроль за заказами в текущей смене
        </p>
      </div>

      {/* Фильтры */}
      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Фильтры</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="Номер заказа"
            value={filters.orderNumber}
            onChange={(e) => setFilters(prev => ({ ...prev, orderNumber: e.target.value }))}
          />
          <Input
            placeholder="Номер столика"
            value={filters.tableNumber}
            onChange={(e) => setFilters(prev => ({ ...prev, tableNumber: e.target.value }))}
          />
          <Input
            placeholder="Официант"
            value={filters.waiterName}
            onChange={(e) => setFilters(prev => ({ ...prev, waiterName: e.target.value }))}
          />
        </div>
        
        {/* Фильтр по времени смены */}
        {shiftHours.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium text-gray-700">Время заказа</div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">От</span>
                <Select
                  value={filters.timeFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, timeFrom: e.target.value }))}
                  options={shiftHours.map(hour => ({ value: hour, label: hour }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Продолжительность</span>
                <Select
                  value={filters.duration}
                  onChange={(e) => setFilters(prev => ({ ...prev, duration: e.target.value }))}
                  options={Array.from({ length: 24 }, (_, i) => ({
                    value: String(i + 1),
                    label: `${i + 1} ч`
                  }))}
                />
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Сбросить фильтры
          </button>
        </div>
      </Card>

      {/* Список заказов */}
      {filteredOrders.length === 0 ? (
        <EmptyState title="Заказы не найдены" description="Измените фильтры или дождитесь новых заказов" />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              hoverable
              onClick={() => handleOrderClick(order)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      #{order.orderNumber}
                    </span>
                    <Badge variant="default">Стол {order.tableNumber}</Badge>
                    {order.waiterName && (
                      <span className="text-sm text-gray-600">{order.waiterName}</span>
                    )}
                    <Badge variant={order.status === 'completed' ? 'success' : 'warning'}>
                      {order.status === 'completed' ? 'Закрыт' : 'Открыт'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {order.totalAmount} ₽
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно с деталями заказа */}
      {selectedOrder && (
        <Modal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          title={`Заказ #${selectedOrder.orderNumber}`}
          size="lg"
        >
          <div className="space-y-4">
            {/* Основная информация */}
            <div className="grid grid-cols-2 gap-4 border-b pb-4">
              <div>
                <div className="text-sm text-gray-500">Время создания</div>
                <div className="font-medium">
                  {new Date(selectedOrder.createdAt).toLocaleString('ru-RU')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Столик</div>
                <div className="font-medium">{selectedOrder.tableNumber}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Официант</div>
                <div className="font-medium">{selectedOrder.waiterName || 'Не указан'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Статус</div>
                <Badge variant={selectedOrder.status === 'completed' ? 'success' : 'warning'}>
                  {selectedOrder.status === 'completed' ? 'Закрыт' : 'Открыт'}
                </Badge>
              </div>
            </div>

            {/* Клиент */}
            <div className="border-b pb-4">
              <div className="text-sm text-gray-500">Клиент</div>
              <div className="font-medium">
                {selectedOrder.customerName || 'Неавторизованный'}
                {selectedOrder.customerId && (
                  <span className="ml-2 text-sm text-gray-500">ID: {selectedOrder.customerId}</span>
                )}
              </div>
              {selectedOrder.billType && (
                <div className="mt-1 text-sm text-gray-600">
                  Тип счёта: {selectedOrder.billType === 'shared' ? 'Совместный' : 'Раздельный'}
                </div>
              )}
            </div>

            {/* Позиции заказа */}
            <div>
              <h3 className="mb-3 font-semibold text-gray-900">Позиции</h3>
              <div className="space-y-2">
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex justify-between border-b pb-2">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        {item.quantity} × {item.discountedPrice || item.price} ₽
                        {item.discountedPrice && (
                          <span className="ml-2 text-gray-400 line-through">{item.price} ₽</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{item.discountedTotal || item.total} ₽</div>
                      {item.discountedTotal && (
                        <div className="text-sm text-gray-400 line-through">{item.total} ₽</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Скидки */}
            {selectedOrder.discounts && selectedOrder.discounts.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="mb-2 font-semibold text-gray-900">Применённые скидки</h3>
                <div className="space-y-1">
                  {selectedOrder.discounts.map((discount, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{discount.name}</span>
                      <span className="font-medium text-green-600">-{discount.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Итого */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Итого</span>
                <span>{selectedOrder.totalAmount} ₽</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
