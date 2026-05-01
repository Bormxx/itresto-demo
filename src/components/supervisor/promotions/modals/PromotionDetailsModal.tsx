import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import PromotionStatusBadge from '../PromotionStatusBadge';

interface Promotion {
  id: string;
  type: 'all_menu' | 'specific_item' | 'bogo' | 'time_based' | 'birthday';
  title: string;
  description: string | null;
  discountPercent: number | null;
  discountAmount: string | null;
  validFrom: string;
  validUntil: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  forAllClients: boolean;
  eventType: string | null;
  daysBeforeEvent: number | null;
  daysAfterEvent: number | null;
  rules: string | null;
  isActive: boolean;
  items?: { id: string; name: any }[];
  client?: { id: string; email: string; firstName: string; lastName: string };
}

interface PromotionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion: Promotion | null;
  onEdit: (promotion: Promotion) => void;
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

export default function PromotionDetailsModal({
  isOpen,
  onClose,
  promotion,
  onEdit,
}: PromotionDetailsModalProps) {
  if (!promotion) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Детали акции"
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{promotion.title}</h3>
          {promotion.description && (
            <p className="mt-2 text-gray-700">{promotion.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Тип акции</p>
            <p className="text-gray-900">{getTypeName(promotion.type)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Скидка</p>
            <p className="text-gray-900">{formatDiscount(promotion)}</p>
          </div>
        </div>

        {promotion.type === 'specific_item' && promotion.items && promotion.items.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">Блюда со скидкой</p>
            <ul className="list-disc list-inside space-y-1">
              {promotion.items.map(item => (
                <li key={item.id} className="text-gray-700">
                  {typeof item.name === 'object' ? (item.name.ru || item.name.en || 'Без названия') : item.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {promotion.type === 'time_based' && promotion.timeFrom && promotion.timeTo && (
          <div>
            <p className="text-sm font-medium text-gray-600">Время действия</p>
            <p className="text-gray-900">{promotion.timeFrom} - {promotion.timeTo}</p>
          </div>
        )}

        {promotion.type === 'bogo' && promotion.rules && (
          <div>
            <p className="text-sm font-medium text-gray-600">Правила BOGO</p>
            <pre className="mt-1 p-2 bg-gray-100 rounded text-sm text-gray-900 overflow-x-auto">
              {JSON.stringify(JSON.parse(promotion.rules), null, 2)}
            </pre>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Применение</p>
            <p className="text-gray-900">
              {promotion.forAllClients ? 'Для всех клиентов' : 'Персональная'}
            </p>
          </div>
          {!promotion.forAllClients && promotion.client && (
            <div>
              <p className="text-sm font-medium text-gray-600">Клиент</p>
              <p className="text-gray-900">
                {promotion.client.firstName} {promotion.client.lastName}
              </p>
              <p className="text-sm text-gray-600">{promotion.client.email}</p>
            </div>
          )}
        </div>

        {promotion.eventType && (
          <div>
            <p className="text-sm font-medium text-gray-600">Событие</p>
            <p className="text-gray-900">
              {promotion.eventType === 'birthday' ? 'День рождения' : promotion.eventType}
            </p>
            {(promotion.daysBeforeEvent || promotion.daysAfterEvent) && (
              <p className="text-sm text-gray-600 mt-1">
                Действует {promotion.daysBeforeEvent ? `за ${promotion.daysBeforeEvent} дней до` : ''}{promotion.daysBeforeEvent && promotion.daysAfterEvent ? ' и ' : ''}{promotion.daysAfterEvent ? `в течение ${promotion.daysAfterEvent} дней после` : ''} события
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-600">Начало действия</p>
            <p className="text-gray-900">{formatDate(promotion.validFrom)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Конец действия</p>
            <p className="text-gray-900">
              {promotion.validUntil ? formatDate(promotion.validUntil) : 'Бессрочно'}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-600">Статус</p>
          <div className="mt-1"><PromotionStatusBadge promotion={promotion} /></div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            onClick={() => {
              onClose();
              onEdit(promotion);
            }}
          >
            Редактировать
          </Button>
          <Button
            onClick={onClose}
            variant="secondary"
          >
            Закрыть
          </Button>
        </div>
      </div>
    </Modal>
  );
}
