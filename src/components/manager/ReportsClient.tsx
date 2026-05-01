'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { toast } from 'sonner';

interface CurrentShift {
  id: string;
  startedAt: string;
  endedAt: string | null;
}

interface Table {
  id: string;
  number: string;
}

interface ShiftWaiter {
  id: string;
  name: string;
}

interface ReportsClientProps {
  restaurantId: string;
  tables: Table[];
  shiftWaiters: ShiftWaiter[];
  currentShift: CurrentShift | null;
}

interface OrdersReport {
  totalOrders: number;
  totalAmount: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  shiftEnd: string;
}

interface DepartmentStaff {
  department: string;
  count: number;
  staff: StaffMember[];
}

interface Conflict {
  id: string;
  orderNumber: string;
  tableNumber: string;
  waiterName: string;
  customerType: string;
  customerId: string;
  comment: string;
  solution: string;
  createdAt: string;
}

export default function ReportsClient({ restaurantId, tables, shiftWaiters, currentShift }: ReportsClientProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  
  // Генерация списка часов смены
  const shiftHours = React.useMemo(() => {
    if (!currentShift) {
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
      hours.push(current.toTimeString().slice(0, 5));
      current.setHours(current.getHours() + 1);
    }
    
    return hours;
  }, [currentShift]);
  
  // Модальные окна
  const [showOrdersReport, setShowOrdersReport] = useState(false);
  const [showStaffReport, setShowStaffReport] = useState(false);
  const [showConflictsReport, setShowConflictsReport] = useState(false);
  
  // Данные отчётов
  const [ordersReport, setOrdersReport] = useState<OrdersReport | null>(null);
  const [staffReport, setStaffReport] = useState<DepartmentStaff[]>([]);
  const [conflictsReport, setConflictsReport] = useState<Conflict[]>([]);
  
  // Фильтры для отчёта по конфликтам
  const [conflictFilters, setConflictFilters] = useState({
    timeFrom: '',
    duration: '1',
    tableId: '',
    waiterId: '',
  });
  
  // Устанавливаем начальное значение timeFrom при загрузке
  React.useEffect(() => {
    if (shiftHours.length > 0 && !conflictFilters.timeFrom) {
      setConflictFilters(prev => ({ ...prev, timeFrom: shiftHours[0] }));
    }
  }, [shiftHours]);

  const fetchOrdersReport = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/manager/reports/orders?restaurantId=${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch orders report');
      
      const data = await response.json();
      setOrdersReport(data);
      setShowOrdersReport(true);
    } catch (error) {
      console.error('Error fetching orders report:', error);
      toast.error('Ошибка загрузки отчёта по заказам');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaffReport = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/manager/reports/staff?restaurantId=${restaurantId}`);
      if (!response.ok) throw new Error('Failed to fetch staff report');
      
      const data = await response.json();
      
      // Проверяем, если нет активной смены
      if (data.noShift) {
        toast.error(data.message || 'Текущая смена не назначена');
        return;
      }
      
      setStaffReport(data.departments || []);
      setShowStaffReport(true);
    } catch (error) {
      console.error('Error fetching staff report:', error);
      toast.error('Ошибка загрузки отчёта по сотрудникам');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConflictsReport = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        restaurantId,
        ...conflictFilters,
      });
      const response = await fetch(`/api/manager/reports/conflicts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch conflicts report');
      
      const data = await response.json();
      setConflictsReport(data.conflicts || []);
      setShowConflictsReport(true);
    } catch (error) {
      console.error('Error fetching conflicts report:', error);
      toast.error('Ошибка загрузки отчёта по конфликтам');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Отчёты</h1>
        <p className="mt-1 text-sm text-gray-600">
          Статистика по заказам, сотрудникам и конфликтам
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Отчёт по заказам */}
        <Card>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Отчёт по заказам</h2>
          <p className="mb-4 text-sm text-gray-600">
            Общее количество заказов и сумма за текущую смену
          </p>
          <Button onClick={fetchOrdersReport} isLoading={isLoading} className="w-full">
            Сформировать отчёт
          </Button>
        </Card>

        {/* Отчёт по сотрудникам */}
        <Card>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Отчёт по сотрудникам</h2>
          <p className="mb-4 text-sm text-gray-600">
            Список сотрудников по отделам в текущей смене
          </p>
          <Button onClick={fetchStaffReport} isLoading={isLoading} variant="success" className="w-full">
            Сформировать отчёт
          </Button>
        </Card>

        {/* Отчёт по конфликтам */}
        <Card>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Отчёт по конфликтам</h2>
          <p className="mb-4 text-sm text-gray-600">
            Конфликтные ситуации за смену с фильтрами
          </p>
          <Button onClick={fetchConflictsReport} isLoading={isLoading} variant="danger" className="w-full">
            Сформировать отчёт
          </Button>
        </Card>
      </div>

      {/* Модальное окно: Отчёт по заказам */}
      <Modal
        isOpen={showOrdersReport}
        onClose={() => setShowOrdersReport(false)}
        title="Отчёт по заказам"
        size="md"
      >
        {ordersReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card variant="outlined">
                <div className="text-sm text-gray-500">Всего заказов</div>
                <div className="text-3xl font-bold text-gray-900">{ordersReport.totalOrders}</div>
              </Card>
              <Card variant="outlined">
                <div className="text-sm text-gray-500">Общая сумма</div>
                <div className="text-3xl font-bold text-green-600">{ordersReport.totalAmount} ₽</div>
              </Card>
            </div>
          </div>
        )}
      </Modal>

      {/* Модальное окно: Отчёт по сотрудникам */}
      <Modal
        isOpen={showStaffReport}
        onClose={() => setShowStaffReport(false)}
        title="Отчёт по сотрудникам в смене"
        size="lg"
      >
        <div className="space-y-4">
          {staffReport.map((dept) => (
            <Card key={dept.department} variant="outlined">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{dept.department}</h3>
                <Badge variant="default">{dept.count} чел.</Badge>
              </div>
              <div className="space-y-2">
                {dept.staff.map((member) => (
                  <div key={member.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                    <div>
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-600">{member.role}</div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      До {new Date(member.shiftEnd).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Modal>

      {/* Модальное окно: Отчёт по конфликтам */}
      <Modal
        isOpen={showConflictsReport}
        onClose={() => setShowConflictsReport(false)}
        title="Отчёт по конфликтным ситуациям"
        size="xl"
      >
        <div className="space-y-4">
          {/* Фильтры */}
          <Card variant="outlined">
            <h3 className="mb-3 font-semibold text-gray-900">Фильтры</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <Select
                value={conflictFilters.tableId}
                onChange={(e) => setConflictFilters(prev => ({ ...prev, tableId: e.target.value }))}
                options={[
                  { value: '', label: 'Все столики' },
                  ...tables.map(table => ({ value: table.id, label: `Стол ${table.number}` }))
                ]}
              />
              <Select
                value={conflictFilters.waiterId}
                onChange={(e) => setConflictFilters(prev => ({ ...prev, waiterId: e.target.value }))}
                options={[
                  { value: '', label: 'Все официанты' },
                  ...shiftWaiters.map(waiter => ({ value: waiter.id, label: waiter.name }))
                ]}
              />
            </div>
            
            {/* Фильтр по времени смены */}
            {shiftHours.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-medium text-gray-700">Время конфликта</div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">От</span>
                    <Select
                      value={conflictFilters.timeFrom}
                      onChange={(e) => setConflictFilters(prev => ({ ...prev, timeFrom: e.target.value }))}
                      options={shiftHours.map(hour => ({ value: hour, label: hour }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Продолжительность</span>
                    <Select
                      value={conflictFilters.duration}
                      onChange={(e) => setConflictFilters(prev => ({ ...prev, duration: e.target.value }))}
                      options={Array.from({ length: 24 }, (_, i) => ({
                        value: String(i + 1),
                        label: `${i + 1} ч`
                      }))}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={fetchConflictsReport}>
                Применить
              </Button>
            </div>
          </Card>

          {/* Статистика */}
          <div className="rounded-lg bg-red-50 p-4">
            <div className="text-sm text-red-600">Всего конфликтных ситуаций</div>
            <div className="text-2xl font-bold text-red-700">{conflictsReport.length}</div>
          </div>

          {/* Список конфликтов */}
          <div className="space-y-3">
            {conflictsReport.map((conflict) => (
              <Card key={conflict.id} variant="outlined">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">
                      Заказ #{conflict.orderNumber} • Стол {conflict.tableNumber}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(conflict.createdAt).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <Badge variant="danger">Конфликт</Badge>
                </div>
                <div className="mb-2 text-sm">
                  <span className="font-medium">Официант:</span> {conflict.waiterName}
                </div>
                <div className="mb-2 text-sm">
                  <span className="font-medium">Клиент:</span> {conflict.customerType} (ID: {conflict.customerId})
                </div>
                <div className="mb-2 rounded-lg bg-gray-50 p-3">
                  <div className="mb-1 text-xs font-semibold text-gray-500">Описание проблемы:</div>
                  <div className="text-sm text-gray-700">{conflict.comment}</div>
                </div>
                <div className="rounded-lg bg-green-50 p-3">
                  <div className="mb-1 text-xs font-semibold text-green-700">Решение:</div>
                  <div className="text-sm text-green-900">{conflict.solution}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
