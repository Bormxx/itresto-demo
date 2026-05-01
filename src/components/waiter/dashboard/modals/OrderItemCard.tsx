type OrderItem = {
  id: string;
  quantity: number;
  quantityDelivered: number;
  priceAtOrder: string;
  kitchenStatus: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'partially_ready' | null;
  barStatus: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'partially_ready' | null;
  menuItem: {
    name: string;
    prepDepartment: {
      name: string;
    } | null;
  } | null;
};

type ItemDelivery = {
  id: string;
  quantity: number;
  pickedUpAt: string;
  waiter: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
};

type OrderItemWithDeliveries = {
  orderItemId: string;
  deliveries: ItemDelivery[];
};

interface OrderItemCardProps {
  item: OrderItem;
  itemDeliveryInfo?: OrderItemWithDeliveries;
  deliveryQty: number;
  remainingQty: number;
  onDeliveryQtyChange: (value: number) => void;
  onSetMax: () => void;
}

function isItemReady(item: OrderItem): boolean {
  const deptName = item.menuItem?.prepDepartment?.name;
  if (deptName === 'Бар') {
    return item.barStatus === 'ready';
  }
  // По умолчанию (для "Кухня" и других отделов) используем kitchenStatus
  return item.kitchenStatus === 'ready';
}

function getItemStatus(item: OrderItem) {
  const deptName = item.menuItem?.prepDepartment?.name;
  
  if (deptName === 'Бар') {
    const status = item.barStatus || 'pending';
    if (status === 'ready') {
      return { status: 'ready', label: 'Готово', color: 'bg-[#dcfce7] text-[#166534]' };
    } else if (status === 'delivered') {
      return { status: 'delivered', label: 'Доставлено', color: 'bg-[#f3f4f6] text-[#4b5563]' };
    } else {
      return { status: 'preparing', label: status === 'pending' ? 'Ожидает' : 'Готовится', color: 'bg-[#ffedd5] text-[#9a3412]' };
    }
  }
  
  // По умолчанию (для "Кухня" и других отделов) используем kitchenStatus
  const status = item.kitchenStatus || 'pending';
  if (status === 'ready') {
    return { status: 'ready', label: 'Готово', color: 'bg-[#dcfce7] text-[#166534]' };
  } else if (status === 'delivered') {
    return { status: 'delivered', label: 'Доставлено', color: 'bg-[#f3f4f6] text-[#4b5563]' };
  } else {
    return { status: 'preparing', label: status === 'pending' ? 'Ожидает' : 'Готовится', color: 'bg-[#ffedd5] text-[#9a3412]' };
  }
}

export default function OrderItemCard({
  item,
  itemDeliveryInfo,
  deliveryQty,
  remainingQty,
  onDeliveryQtyChange,
  onSetMax,
}: OrderItemCardProps) {
  const itemStatus = getItemStatus(item);
  const ready = isItemReady(item);

  return (
    <div className="rounded-lg border-2 border-[#e5e7eb] bg-[#f9fafb] p-3">
      <div className="mb-2 flex items-start justify-between">
        <div className="flex-1">
          <div className="font-semibold text-[#111827]">
            {item.menuItem?.name || 'Блюдо'}
          </div>
          <div className="mt-1 text-sm text-[#4b5563]">
            Заказано: {item.quantity} • Забрано: {item.quantityDelivered}
          </div>
          <div className="mt-1">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${itemStatus.color}`}>
              {itemStatus.label}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-[#111827]">
            {(parseFloat(item.priceAtOrder) * item.quantity).toFixed(2)} ₽
          </div>
        </div>
      </div>

      {/* Информация о том, кто забрал блюда */}
      {itemDeliveryInfo && itemDeliveryInfo.deliveries.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-[#d1d5db] pt-2">
          <div className="text-xs font-semibold text-[#374151]">Забрано официантами:</div>
          {itemDeliveryInfo.deliveries.map((delivery) => (
            <div key={delivery.id} className="flex items-center justify-between text-xs text-[#6b7280]">
              <span>
                👤 {delivery.waiter.firstName} {delivery.waiter.lastName}
              </span>
              <span>
                {delivery.quantity} шт. • {new Date(delivery.pickedUpAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Ввод для забора готовых блюд */}
      {ready && remainingQty > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t border-[#d1d5db] pt-2">
          <label className="text-sm text-[#374151]">
            Забрать:
          </label>
          <input
            type="number"
            min="0"
            max={remainingQty}
            value={deliveryQty}
            onChange={(e) => {
              const value = Math.min(
                Math.max(0, parseInt(e.target.value) || 0),
                remainingQty
              );
              onDeliveryQtyChange(value);
            }}
            className="w-20 rounded border border-[#d1d5db] px-2 py-1 text-center text-sm text-[#111827]"
          />
          <span className="text-sm text-[#4b5563]">
            из {remainingQty}
          </span>
          <button
            onClick={onSetMax}
            className="ml-auto rounded bg-[#3b82f6] px-3 py-1 text-xs text-[#ffffff] hover:bg-[#2563eb]"
          >
            Всё
          </button>
        </div>
      )}
    </div>
  );
}
