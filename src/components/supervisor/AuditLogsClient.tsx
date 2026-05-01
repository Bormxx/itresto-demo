'use client';

import { useEffect, useState } from 'react';
import { PageHeaderSkeleton, TableRowSkeleton } from '@/components/ui/Skeleton';

interface AuditLog {
  id: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout';
  entityType: string | null;
  entityId: string | null;
  changes: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
}

interface AuditLogsData {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export default function AuditLogsClient() {
  const [data, setData] = useState<AuditLogsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Фильтры
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchLogs();
  }, [dateFrom, dateTo, action, entityType, currentPage]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      });

      if (action) params.append('action', action);
      if (entityType) params.append('entityType', entityType);

      const response = await fetch(`/api/supervisor/audit-logs?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: 'Создание',
      update: 'Обновление',
      delete: 'Удаление',
      login: 'Вход',
      logout: 'Выход',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      login: 'bg-purple-100 text-purple-800',
      logout: 'bg-gray-100 text-gray-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatUserName = (log: AuditLog) => {
    if (!log.userId) return 'Система';
    const name = [log.userFirstName, log.userLastName].filter(Boolean).join(' ');
    return name || log.userEmail || 'Неизвестный пользователь';
  };

  const parseChanges = (changes: string | null) => {
    if (!changes) return null;
    try {
      return JSON.parse(changes);
    } catch {
      return null;
    }
  };

  const totalPages = data ? Math.ceil(data.total / itemsPerPage) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Дата и время', 'Пользователь', 'Действие', 'Тип сущности', 'IP адрес'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 10 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={5} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Ошибка: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Журнал аудита</h1>
        <p className="text-gray-600 mt-1">
          История всех действий пользователей в системе
        </p>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Фильтры</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              С даты
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              По дату
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Действие
            </label>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Все действия</option>
              <option value="create">Создание</option>
              <option value="update">Обновление</option>
              <option value="delete">Удаление</option>
              <option value="login">Вход</option>
              <option value="logout">Выход</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип сущности
            </label>
            <input
              type="text"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="user, menu_item, order..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-900">
          Найдено записей: <span className="font-semibold">{data?.total || 0}</span>
          {totalPages > 1 && (
            <span className="ml-3">
              Страница {currentPage} из {totalPages}
            </span>
          )}
        </p>
      </div>

      {/* Таблица логов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата и время
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действие
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип сущности
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP адрес
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Детали
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Логи не найдены
                  </td>
                </tr>
              ) : (
                data?.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatUserName(log)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.entityType || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.changes && (
                        <button
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {expandedLog === log.id ? 'Скрыть' : 'Показать'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Детали изменений */}
        {expandedLog && data?.logs.map((log) =>
          log.id === expandedLog && log.changes ? (
            <div key={log.id} className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Детали изменений:</h4>
              <pre className="text-xs text-gray-700 bg-white p-4 rounded border border-gray-200 overflow-x-auto">
                {JSON.stringify(parseChanges(log.changes), null, 2)}
              </pre>
            </div>
          ) : null
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Назад
          </button>
          <span className="px-4 py-2 border border-gray-300 rounded-lg bg-white">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
