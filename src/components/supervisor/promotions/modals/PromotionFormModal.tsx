import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface FormData {
  type: 'all_menu' | 'specific_item' | 'bogo' | 'time_based' | 'birthday';
  title: string;
  description: string;
  discountPercent: string;
  discountAmount: string;
  validFrom: string;
  validUntil: string;
  timeFrom: string;
  timeTo: string;
  forAllClients: boolean;
  clientId: string;
  eventType: string;
  daysBeforeEvent: string;
  daysAfterEvent: string;
  birthdayPeriodDays: string;
  rules: string;
  menuItemIds: string[];
  isActive: boolean;
  isIndefinite: boolean;
}

interface MenuItem {
  id: string;
  name: any;
  price: string;
}

interface Client {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Promotion {
  id: string;
  type: 'all_menu' | 'specific_item' | 'bogo' | 'time_based' | 'birthday';
  title: string;
}

interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingPromotion: Promotion | null;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  menuItems: MenuItem[];
  clients: Client[];
  error: string | null;
  t: (key: string) => string;
}

export default function PromotionFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingPromotion,
  formData,
  setFormData,
  menuItems,
  clients,
  error,
  t,
}: PromotionFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPromotion ? t('editPromotion') : t('createPromotion')}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Тип акции *
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            required
          >
            <option value="all_menu">Скидка на все меню</option>
            <option value="specific_item">Скидка на конкретные блюда</option>
            <option value="bogo">BOGO (2 по цене 1)</option>
            <option value="time_based">Скидка по времени</option>
            <option value="birthday">В честь дня рождения</option>
          </select>
        </div>

        {/* Поле для акций в честь дня рождения */}
        {formData.type === 'birthday' && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Период действия (дней) *
            </label>
            <Input
              type="number"
              min="0"
              value={formData.birthdayPeriodDays}
              onChange={(e) => setFormData({ ...formData, birthdayPeriodDays: e.target.value })}
              placeholder="7"
              required={formData.type === 'birthday'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Количество дней до и после дня рождения. Например, 7 для недели до и после дня рождения.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Название акции *
          </label>
          <Input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
          />
        </div>

        {/* Выбор блюд для specific_item */}
        {formData.type === 'specific_item' && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Выберите блюда *
            </label>
            <div className="border border-gray-300 rounded p-2 max-h-48 overflow-y-auto">
              {menuItems.length === 0 ? (
                <p className="text-sm text-gray-500">Нет доступных блюд</p>
              ) : (
                menuItems.map(item => (
                  <label key={item.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={formData.menuItemIds.includes(item.id)}
                      onChange={(e) => {
                        const newIds = e.target.checked
                          ? [...formData.menuItemIds, item.id]
                          : formData.menuItemIds.filter(id => id !== item.id);
                        setFormData({ ...formData, menuItemIds: newIds });
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">
                      {typeof item.name === 'object' ? (item.name.ru || item.name.en || 'Без названия') : item.name} - {item.price} ₽
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Правила для BOGO */}
        {formData.type === 'bogo' && (
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Правила BOGO
            </label>
            <textarea
              value={formData.rules}
              onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              rows={2}
              placeholder='Например: {"buy": 2, "getFree": 1, "description": "При покупке 2 пива, 3-е бесплатно"}'
            />
            <p className="text-xs text-gray-500 mt-1">
              Введите правила в формате JSON
            </p>
          </div>
        )}

        {/* Временные рамки для time_based */}
        {formData.type === 'time_based' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Время начала *
              </label>
              <Input
                type="time"
                value={formData.timeFrom}
                onChange={(e) => setFormData({ ...formData, timeFrom: e.target.value })}
                required={formData.type === 'time_based'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Время окончания *
              </label>
              <Input
                type="time"
                value={formData.timeTo}
                onChange={(e) => setFormData({ ...formData, timeTo: e.target.value })}
                required={formData.type === 'time_based'}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Скидка в % (0-100)
            </label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.discountPercent}
              onChange={(e) => setFormData({ 
                ...formData, 
                discountPercent: e.target.value,
                discountAmount: ''
              })}
              disabled={!!formData.discountAmount}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Фиксированная скидка (₽)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.discountAmount}
              onChange={(e) => setFormData({ 
                ...formData, 
                discountAmount: e.target.value,
                discountPercent: ''
              })}
              disabled={!!formData.discountPercent}
            />
          </div>
        </div>

        {/* Для всех или персональная */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Применение акции
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={formData.forAllClients}
                onChange={() => setFormData({ ...formData, forAllClients: true, clientId: '' })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Для всех клиентов</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!formData.forAllClients}
                onChange={() => setFormData({ ...formData, forAllClients: false })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Персональная акция</span>
            </label>
          </div>
        </div>

        {/* Выбор клиента для персональной акции */}
        {!formData.forAllClients && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Выберите клиента *
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                required={!formData.forAllClients}
              >
                <option value="">-- Выберите клиента --</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} ({client.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Поля для акций по событиям (день рождения) */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                Тип события
              </label>
              <select
                value={formData.eventType}
                onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">-- Нет события --</option>
                <option value="birthday">День рождения</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Если выбран тип события, акция будет применяться автоматически в указанный период относительно даты события
              </p>
            </div>

            {formData.eventType && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Дней до события
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.daysBeforeEvent}
                    onChange={(e) => setFormData({ ...formData, daysBeforeEvent: e.target.value })}
                    placeholder="7"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Например, 7 для недели до дня рождения
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Дней после события
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.daysAfterEvent}
                    onChange={(e) => setFormData({ ...formData, daysAfterEvent: e.target.value })}
                    placeholder="7"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Например, 7 для недели после дня рождения
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Начало действия *
            </label>
            <Input
              type="date"
              value={formData.validFrom}
              onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Конец действия {!formData.isIndefinite && '*'}
            </label>
            <Input
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              required={!formData.isIndefinite}
              disabled={formData.isIndefinite}
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isIndefinite}
              onChange={(e) => setFormData({ 
                ...formData, 
                isIndefinite: e.target.checked,
                validUntil: e.target.checked ? '' : formData.validUntil
              })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Бессрочная акция</span>
          </label>
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
            onClick={onClose}
            variant="secondary"
          >
            Отмена
          </Button>
          <Button type="submit">
            {editingPromotion ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
