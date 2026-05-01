import DataTable from '@/components/supervisor/DataTable';
import Button from '@/components/ui/Button';
import PromotionStatusBadge from './PromotionStatusBadge';

interface Promotion {
  id: string;
  type: 'all_menu' | 'specific_item' | 'bogo' | 'time_based' | 'birthday';
  title: string;
  description: string | null;
  discountPercent: number | null;
  discountAmount: string | null;
  validFrom: string;
  validUntil: string | null;
  forAllClients: boolean;
  isActive: boolean;
  client?: { id: string; email: string; firstName: string; lastName: string };
}

interface PromotionTableProps {
  promotions: Promotion[];
  onRowClick: (promotion: Promotion) => void;
  onEdit: (promotion: Promotion) => void;
  onDelete: (promotion: Promotion) => void;
  onToggleActive: (promotion: Promotion) => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDiscount = (promotion: Promotion) => {
  if (promotion.discountPercent) {
    return `${promotion.discountPercent}%`;
  } else if (promotion.discountAmount) {
    return `${promotion.discountAmount} ₽`;
  }
  return '—';
};

const getTypeName = (type: string) => {
  const types: Record<string, string> = {
    all_menu: 'Все меню',
    specific_item: 'Конкретные блюда',
    bogo: 'BOGO (2 по цене 1)',
    time_based: 'По времени',
    birthday: 'День рождения',
  };
  return types[type] || type;
};

export default function PromotionTable({
  promotions,
  onRowClick,
  onEdit,
  onDelete,
  onToggleActive,
}: PromotionTableProps) {
  const columns = [
    { key: 'title', label: 'Название' },
    { 
      key: 'type', 
      label: 'Тип',
      render: (promotion: Promotion) => getTypeName(promotion.type)
    },
    { 
      key: 'discount', 
      label: 'Скидка',
      render: (promotion: Promotion) => formatDiscount(promotion)
    },
    { 
      key: 'client', 
      label: 'Клиент',
      render: (promotion: Promotion) => 
        promotion.forAllClients 
          ? 'Все' 
          : (promotion.client ? `${promotion.client.firstName} ${promotion.client.lastName}` : '—')
    },
    { 
      key: 'validFrom', 
      label: 'Начало',
      render: (promotion: Promotion) => formatDate(promotion.validFrom)
    },
    { 
      key: 'validUntil', 
      label: 'Конец',
      render: (promotion: Promotion) => 
        promotion.validUntil ? formatDate(promotion.validUntil) : 'Бессрочно'
    },
    { 
      key: 'status', 
      label: 'Статус',
      render: (promotion: Promotion) => <PromotionStatusBadge promotion={promotion} />
    },
    {
      key: 'actions',
      label: 'Действия',
      render: (promotion: Promotion) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(promotion);
            }}
            className={`px-3 py-1 rounded text-sm ${
              promotion.isActive
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : 'bg-green-100 hover:bg-green-200 text-green-700'
            }`}
          >
            {promotion.isActive ? 'Деактивировать' : 'Активировать'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(promotion);
            }}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Изменить
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(promotion);
            }}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Удалить
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={promotions}
      columns={columns}
      onRowClick={onRowClick}
    />
  );
}
