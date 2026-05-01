'use client';

import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  idKey?: keyof T;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  selectedIds = [],
  onSelectionChange,
  idKey = 'id' as keyof T,
}: DataTableProps<T>) {
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    const currentTableIds = data.map(item => item[idKey] as string);
    
    if (checked) {
      // Добавляем все ID из текущей таблицы к уже выбранным
      const newSelectedIds = [...new Set([...selectedIds, ...currentTableIds])];
      onSelectionChange(newSelectedIds);
    } else {
      // Убираем все ID текущей таблицы из выбранных
      onSelectionChange(selectedIds.filter(id => !currentTableIds.includes(id)));
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  // Проверяем, выбраны ли все элементы ТЕКУЩЕЙ таблицы
  const currentTableIds = data.map(item => item[idKey] as string);
  const selectedInCurrentTable = currentTableIds.filter(id => selectedIds.includes(id));
  const isAllSelected = data.length > 0 && selectedInCurrentTable.length === data.length;
  const isSomeSelected = selectedInCurrentTable.length > 0 && selectedInCurrentTable.length < data.length;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {onSelectionChange && (
              <th className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isSomeSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onSelectionChange ? 1 : 0)}
                className="px-6 py-12 text-center text-sm text-gray-500"
              >
                Нет данных для отображения
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const itemId = item[idKey] as string;
              const isSelected = selectedIds.includes(itemId);

              return (
                <tr
                  key={itemId}
                  onClick={() => onRowClick?.(item)}
                  className={`${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  } ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  {onSelectionChange && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(itemId, e.target.checked);
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-sm text-gray-900">
                      {column.render
                        ? column.render(item)
                        : (item[column.key] as ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
