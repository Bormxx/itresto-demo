import * as XLSX from 'xlsx';

interface ExportOrder {
  id: string;
  createdAt: string;
  tableNumber?: number;
  guestType: string;
  billType: string;
  totalAmount: string;
  discountAmount: string | null;
  finalAmount: string;
  paymentMethod: string | null;
  status: string;
  waiterName?: string;
  clientName?: string;
}

interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

/**
 * Экспорт заказов в Excel формат
 */
export const exportToExcel = (orders: ExportOrder[], options?: ExportOptions) => {
  const filename = options?.filename || `orders_${new Date().toISOString().split('T')[0]}.xlsx`;
  const sheetName = options?.sheetName || 'Заказы';

  // Преобразуем данные для Excel
  const excelData = orders.map(order => ({
    'ID заказа': order.id.slice(0, 8),
    'Дата и время': new Date(order.createdAt).toLocaleString('ru-RU'),
    'Столик': order.tableNumber || '—',
    'Официант': order.waiterName || '—',
    'Клиент': order.clientName || '—',
    'Тип гостя': getGuestTypeLabel(order.guestType),
    'Тип счёта': getBillTypeLabel(order.billType),
    'Сумма заказа': parseFloat(order.totalAmount).toFixed(2),
    'Скидка': order.discountAmount ? parseFloat(order.discountAmount).toFixed(2) : '0.00',
    'Итого': parseFloat(order.finalAmount).toFixed(2),
    'Способ оплаты': order.paymentMethod ? getPaymentMethodLabel(order.paymentMethod) : '—',
    'Статус': getStatusLabel(order.status),
  }));

  // Создаем workbook и worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Устанавливаем ширину колонок
  const colWidths = [
    { wch: 10 }, // ID
    { wch: 20 }, // Дата
    { wch: 8 },  // Столик
    { wch: 20 }, // Официант
    { wch: 20 }, // Клиент
    { wch: 12 }, // Тип гостя
    { wch: 15 }, // Тип счёта
    { wch: 12 }, // Сумма
    { wch: 10 }, // Скидка
    { wch: 12 }, // Итого
    { wch: 15 }, // Оплата
    { wch: 12 }, // Статус
  ];
  ws['!cols'] = colWidths;

  // Добавляем worksheet в workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Сохраняем файл
  XLSX.writeFile(wb, filename);
};

/**
 * Экспорт заказов в CSV формат
 */
export const exportToCSV = (orders: ExportOrder[], options?: ExportOptions) => {
  const filename = options?.filename || `orders_${new Date().toISOString().split('T')[0]}.csv`;

  // Преобразуем данные для CSV
  const csvData = orders.map(order => ({
    'ID заказа': order.id.slice(0, 8),
    'Дата и время': new Date(order.createdAt).toLocaleString('ru-RU'),
    'Столик': order.tableNumber || '—',
    'Официант': order.waiterName || '—',
    'Клиент': order.clientName || '—',
    'Тип гостя': getGuestTypeLabel(order.guestType),
    'Тип счёта': getBillTypeLabel(order.billType),
    'Сумма заказа': parseFloat(order.totalAmount).toFixed(2),
    'Скидка': order.discountAmount ? parseFloat(order.discountAmount).toFixed(2) : '0.00',
    'Итого': parseFloat(order.finalAmount).toFixed(2),
    'Способ оплаты': order.paymentMethod ? getPaymentMethodLabel(order.paymentMethod) : '—',
    'Статус': getStatusLabel(order.status),
  }));

  // Создаем CSV строку
  const headers = Object.keys(csvData[0] || {});
  const csvContent = [
    headers.join(','),
    ...csvData.map(row => 
      headers.map(header => {
        const value = row[header as keyof typeof row];
        // Экранируем запятые и кавычки
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',')
    )
  ].join('\n');

  // Создаем Blob и скачиваем
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM для корректного отображения кириллицы
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Экспорт сводной статистики в Excel
 */
export const exportStatsToExcel = (
  stats: {
    totalOrders: number;
    totalRevenue: string;
    avgCheck: string;
    completedOrders: number;
  },
  topItems: Array<{ name: string; count: number; revenue: string }>,
  options?: ExportOptions
) => {
  const filename = options?.filename || `statistics_${new Date().toISOString().split('T')[0]}.xlsx`;

  const wb = XLSX.utils.book_new();

  // Лист 1: Общая статистика
  const statsData = [
    { 'Показатель': 'Всего заказов', 'Значение': stats.totalOrders },
    { 'Показатель': 'Общая выручка', 'Значение': `${parseFloat(stats.totalRevenue).toFixed(2)} ₽` },
    { 'Показатель': 'Средний чек', 'Значение': `${parseFloat(stats.avgCheck).toFixed(2)} ₽` },
    { 'Показатель': 'Завершённых заказов', 'Значение': stats.completedOrders },
  ];
  const wsStats = XLSX.utils.json_to_sheet(statsData);
  wsStats['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsStats, 'Статистика');

  // Лист 2: Топ блюд
  const topItemsData = topItems.map((item, index) => ({
    '№': index + 1,
    'Название блюда': item.name,
    'Количество заказов': item.count,
    'Выручка': `${parseFloat(item.revenue).toFixed(2)} ₽`,
  }));
  const wsTopItems = XLSX.utils.json_to_sheet(topItemsData);
  wsTopItems['!cols'] = [{ wch: 5 }, { wch: 40 }, { wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsTopItems, 'Топ блюд');

  // Сохраняем файл
  XLSX.writeFile(wb, filename);
};

// Вспомогательные функции для перевода значений
function getGuestTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    individual: 'Индивидуально',
    split_equal: 'Поровну',
    split_by_items: 'По блюдам',
  };
  return labels[type] || type;
}

function getBillTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    dine_in: 'В зале',
    takeaway: 'На вынос',
    delivery: 'Доставка',
  };
  return labels[type] || type;
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Наличные',
    card: 'Карта',
    online: 'Онлайн',
  };
  return labels[method] || method;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Ожидает',
    confirmed: 'Подтверждён',
    preparing: 'Готовится',
    ready: 'Готов',
    served: 'Подан',
    completed: 'Завершён',
    cancelled: 'Отменён',
  };
  return labels[status] || status;
}
