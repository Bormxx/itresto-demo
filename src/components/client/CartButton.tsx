'use client';

import { useCartStore } from '@/lib/store/cartStore';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ActiveOrders } from './ActiveOrders';
import { CheckoutModal } from './CheckoutModal';
import { BillTypeDialog } from './BillTypeDialog';
import { TablePinDisplay } from './TablePinDisplay';
import { TablePinModal } from './TablePinModal';
import { EditMenuItemModal } from './EditMenuItemModal';
import { CartItemCard, CartSummary, EmptyCartView } from './cart';
import { ModifierInput } from '@/types';
import { getCurrentOrderId, clearOrderId } from '@/lib/orderStorage';
import { getGuestId } from '@/lib/guestIdentity';
import { useActiveOrders } from '@/hooks/useActiveOrders';
import { useSession } from 'next-auth/react';
import { useTableAccess } from '@/hooks/useTableAccess';
import { useOrderSubmission } from '@/hooks/useOrderSubmission';

interface CartButtonProps {
  tableId?: string;
  restaurantId: string;
}

export function CartButton({ tableId, restaurantId }: CartButtonProps) {
  const t = useTranslations('common');
  const tCart = useTranslations('cart');
  const tOrder = useTranslations('order');
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckout, setIsCheckout] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillTypeDialog, setShowBillTypeDialog] = useState(false);
  const [lastOrderId, setLastOrderId] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [hasActiveOrders, setHasActiveOrders] = useState(false);
  const [myOrdersTotal, setMyOrdersTotal] = useState(0);
  const [allOrdersTotal, setAllOrdersTotal] = useState(0);
  const [pendingItemsCount, setPendingItemsCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantSlug = params.restaurant as string;
  
  const { items, removeItem, addItem, decrementItem, updateModifierCount, getItemPrice, clearItems, clearCart, getTotalItems, getTotalPrice, billType, setBillType, billTypeAsked, resetBillType } = useCartStore();
  const { hasActiveOrders: hasActiveOrdersInDB } = useActiveOrders(tableId, tableNumber);
  const { showPinVerification, setShowPinVerification, checkTableAccess, grantAccess } = useTableAccess(tableId);
  const { submitOrder, loading, error, success, orderNumber, tablePin, resetState } = useOrderSubmission();
  const { data: session } = useSession();
  
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  // Предотвращение hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Автозаполнение номера столика из URL (при сканировании QR)
  useEffect(() => {
    const tableFromUrl = searchParams.get('table');
    if (tableFromUrl && !tableNumber) {
      setTableNumber(tableFromUrl);
    }
  }, [searchParams, tableNumber]);

  // Загрузка pending items count при монтировании и обновлениях
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const currentOrderId = getCurrentOrderId(tableId, tableNumber);
        const deviceUuid = session?.user ? null : getGuestId();
        
        let url = '/api/orders/active';
        const params = new URLSearchParams();
        
        if (currentOrderId) {
          params.append('orderIds', currentOrderId);
          if (deviceUuid) {
            params.append('deviceUuid', deviceUuid);
          }
          if (tableNumber) {
            params.append('tableNumber', tableNumber);
          }
        } else if (tableId) {
          params.append('tableId', tableId);
        } else {
          return; // Нет данных для запроса
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const fetchedOrders = data.orders || [];
          
          // Подсчитываем pending items
          const pendingCount = fetchedOrders.reduce((sum: number, order: any) => {
            if (order.status === 'completed' || order.status === 'cancelled') {
              return sum;
            }
            const pendingItems = order.orderItems.filter((item: any) => 
              item.status === 'pending' || item.status === 'preparing'
            );
            return sum + pendingItems.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0);
          }, 0);
          
          setPendingItemsCount(pendingCount);
        }
      } catch (error) {
        console.error('Failed to load pending count:', error);
      }
    };

    loadPendingCount();

    // Обновляем каждые 10 секунд
    const interval = setInterval(loadPendingCount, 10000);
    return () => clearInterval(interval);
  }, [tableId, tableNumber, ordersRefreshKey]);

  // Block body scroll when cart modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCheckout = async () => {
    // Проверяем статус столика перед оформлением (защита от злоумышленников)
    if (tableId && tableNumber) {
      const hasAccess = await checkTableAccess(tableNumber);
      if (!hasAccess) {
        setIsOpen(false);
        return;
      }
    }
    
    // Проверяем: нет открытых заказов - начинаем с чистого листа
    const isFirstOrder = !hasActiveOrders;
    
    if (isFirstOrder) {
      // Если тип счёта был выбран в прошлой сессии (предыдущий заказ закрыт),
      // сбрасываем его чтобы клиент мог выбрать заново
      if (billTypeAsked) {
        resetBillType();
      }
      // Закрываем корзину перед показом диалога выбора типа счёта
      setIsOpen(false);
      setShowBillTypeDialog(true);
      return;
    }
    
    setIsCheckout(true);
    resetState();
  };

  const handleBillTypeSelect = async (selectedBillType: 'shared' | 'separate') => {
    setBillType(selectedBillType);
    setShowBillTypeDialog(false);
    setIsOpen(true);
    setIsCheckout(true);
    resetState();
    
    // Отправляем заказ сразу после выбора типа счёта
    if (!tableNumber.trim()) {
      return;
    }

    const result = await submitOrder({
      items,
      tableNumber,
      billType: selectedBillType, // Используем выбранный тип счёта напрямую
      tableId,
      restaurantId,
    });

    if (result) {
      setLastOrderId(result.order.id);
      
      // Если вернулся PIN (первый заказ за столиком), сохраняем его
      if (result.tablePin && tableId) {
        localStorage.setItem(`itresto-table-pin-${tableId}`, result.tablePin);
        // Отправляем событие для обновления компонентов
        window.dispatchEvent(new Event('pinUpdated'));
      }
      
      // Сохраняем доступ к столику после любого успешного заказа
      if (tableId) {
        localStorage.setItem(`itresto-table-access-${tableId}`, 'granted');
      }
      
      // Очистить только товары из корзины, но оставить billType
      clearItems();
      
      // Триггерить обновление ActiveOrders
      setOrdersRefreshKey(prev => prev + 1);
      
      // Через 3 секунды закрыть модалку (только если нет PIN для показа)
      if (!result.tablePin) {
        setTimeout(() => {
          setIsOpen(false);
          setIsCheckout(false);
          setTableNumber('');
        }, 3000);
      }
    }
  };

  const handleSubmitOrder = async () => {
    if (!tableNumber.trim()) {
      return;
    }

    const result = await submitOrder({
      items,
      tableNumber,
      billType,
      tableId,
      restaurantId,
    });

    if (result) {
      setLastOrderId(result.order.id);
      
      // Если вернулся PIN (первый заказ за столиком), сохраняем его
      if (result.tablePin && tableId) {
        localStorage.setItem(`itresto-table-pin-${tableId}`, result.tablePin);
        // Отправляем событие для обновления компонентов
        window.dispatchEvent(new Event('pinUpdated'));
      }
      
      // Сохраняем доступ к столику после любого успешного заказа
      if (tableId) {
        localStorage.setItem(`itresto-table-access-${tableId}`, 'granted');
      }
      
      // Очистить только товары из корзины, но оставить billType
      clearItems();
      
      // Триггерить обновление ActiveOrders
      setOrdersRefreshKey(prev => prev + 1);
      
      // Через 3 секунды закрыть модалку (только если нет PIN для показа)
      if (!result.tablePin) {
        setTimeout(() => {
          setIsOpen(false);
          setIsCheckout(false);
          setTableNumber('');
        }, 3000);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsCheckout(false);
    resetState();
  };

  const handlePinVerificationSuccess = () => {
    grantAccess();
    // После успешной проверки PIN продолжаем с выбором типа счета или оформлением
    setIsOpen(true);
    handleCheckout(); // Повторный вызов без повторной проверки PIN
  };

  const handleOrdersUpdate = (hasOrders: boolean, myTotal: number, allTotal: number, pendingCount: number) => {
    setHasActiveOrders(hasOrders);
    setMyOrdersTotal(myTotal);
    setAllOrdersTotal(allTotal);
    setPendingItemsCount(pendingCount);
  };

  const handleEditItem = (index: number) => {
    setEditingItemIndex(index);
    setShowEditModal(true);
  };

  const handleSaveEditedItem = async (modifiers: ModifierInput[]) => {
    if (editingItemIndex === null) return;
    
    const editedItem = items[editingItemIndex];
    
    // Удаляем старую позицию
    removeItem(editedItem.menuItemId);
    
    // Добавляем новую с обновленными модификаторами
    addItem({
      menuItemId: editedItem.menuItemId,
      name: editedItem.name,
      basePrice: editedItem.basePrice,
      imageUrl: editedItem.imageUrl,
      modifiers,
    });
    
    setShowEditModal(false);
    setEditingItemIndex(null);
  };

  const handleOpenCart = async () => {
    // Проверяем актуальность сохраненного заказа перед открытием корзины
    const currentOrderId = getCurrentOrderId(tableId, tableNumber);
    
    if (currentOrderId) {
      try {
        const deviceUuid = session?.user ? null : getGuestId();
        const params = new URLSearchParams();
        params.append('orderIds', currentOrderId);
        if (deviceUuid) {
          params.append('deviceUuid', deviceUuid);
        }
        if (tableNumber) {
          params.append('tableNumber', tableNumber);
        }
        
        const response = await fetch(`/api/orders/active?${params.toString()}`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Если нет активных заказов - очищаем ТОЛЬКО данные заказа, НЕ трогая items в корзине
          if (!data.hasActiveOrders || data.orders?.length === 0) {
            if (billType) {
              clearOrderId(billType, tableId, tableNumber);
            }
            // НЕ вызываем clearCart() - пользователь мог добавить новые блюда
            if (tableId) {
              localStorage.removeItem(`itresto-table-access-${tableId}`);
              localStorage.removeItem(`itresto-table-pin-${tableId}`);
              // Отправляем событие для обновления TablePinBadge
              window.dispatchEvent(new Event('pinUpdated'));
            }
            setHasActiveOrders(false);
            setMyOrdersTotal(0);
            setAllOrdersTotal(0);
            setOrdersRefreshKey(prev => prev + 1);
          }
        }
      } catch (err) {
        console.error('Error checking active order:', err);
      }
    }
    
    // Открываем корзину ПОСЛЕ завершения проверки
    setIsOpen(true);
  };

  return (
    <>
      {/* Диалог выбора типа счёта */}
      <BillTypeDialog
        isOpen={showBillTypeDialog}
        onSelect={handleBillTypeSelect}
      />

      {/* Модальное окно проверки PIN перед оформлением заказа */}
      {showPinVerification && tableId && tableNumber && (
        <TablePinModal
          restaurantId={restaurantSlug}
          tableId={tableId}
          tableNumber={tableNumber}
          onSuccess={handlePinVerificationSuccess}
          onCancel={() => setShowPinVerification(false)}
        />
      )}

      {/* Кнопка корзины */}
      <button
        onClick={handleOpenCart}
        className="relative shrink-0 rounded-full bg-[#f3f4f6] h-10 w-10 flex items-center justify-center text-[#000000] hover:bg-[#e5e7eb]"
        aria-label={t('cart')}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {/* Красный бейдж - items в корзине */}
        {mounted && totalItems > 0 && (
          <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#ef4444] text-xs font-bold text-[#ffffff]">
            {totalItems}
          </span>
        )}
        {/* Голубой бейдж - оформленные, но не доставленные items */}
        {mounted && pendingItemsCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#3b82f6] text-xs font-bold text-[#ffffff]">
            {pendingItemsCount}
          </span>
        )}
      </button>

      {/* Модальное окно корзины */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay с прозрачностью 70% */}
          <div className="absolute inset-0 bg-[#000000] opacity-70" />
          
          <div className="relative w-full max-w-lg rounded-lg bg-[#ffffff] shadow-xl">
            {/* Заголовок */}
            <div className="sticky top-0 z-10 border-b bg-[#ffffff] p-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#111827]">{t('cart')}</h2>
                <button
                  onClick={handleClose}
                  className="text-[#9ca3af] hover:text-[#4b5563]"
                  aria-label={t('close')}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Содержимое */}
            <div className="p-4">
              {success ? (
                <div className="py-8 text-center space-y-6">
                  <div>
                    <div className="mb-4 text-6xl">✅</div>
                    <h3 className="mb-2 text-2xl font-bold text-[#16a34a]">{tCart('orderPlaced')}</h3>
                    <p className="text-[#4b5563]">{tOrder('orderNumber')} {orderNumber}</p>
                    <p className="mt-2 text-sm text-[#6b7280]">
                      {tCart('waiterWillCome')}
                    </p>
                  </div>
                  
                  {/* Показываем PIN если это первый заказ за столиком */}
                  {tablePin && tableNumber && (
                    <div className="mt-6">
                      <TablePinDisplay pin={tablePin} tableNumber={tableNumber} />
                    </div>
                  )}
                  
                  {tablePin && (
                    <button
                      onClick={handleClose}
                      className="mt-4 w-full rounded-lg bg-[#2563eb] px-4 py-3 font-semibold text-[#ffffff] hover:bg-[#1d4ed8]"
                    >
                      {tCart('gotIt')}
                    </button>
                  )}
                </div>
              ) : items.length === 0 ? (
                <EmptyCartView
                  tableId={tableId}
                  tableNumber={tableNumber}
                  refreshKey={ordersRefreshKey}
                  hasActiveOrders={hasActiveOrders}
                  currentBillType={billType}
                  onOrdersLoaded={handleOrdersUpdate}
                  onPayBill={() => {
                    setShowPaymentModal(true);
                    setIsOpen(false);
                  }}
                />
              ) : !isCheckout ? (
                <>
                  {/* Активные заказы */}
                  <div className="mb-6">
                    <ActiveOrders
                      tableId={tableId}
                      tableNumber={tableNumber}
                      refreshKey={ordersRefreshKey}
                      onOrdersLoaded={(hasOrders, myTotal, allTotal, pendingCount) => handleOrdersUpdate(hasOrders, myTotal, allTotal, pendingCount)}
                      currentBillType={billType}
                    />
                  </div>

                  {/* Неподтверждённые блюда в корзине */}
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <CartItemCard
                        key={`${item.menuItemId}-${index}`}
                        item={item}
                        index={index}
                        totalPrice={getItemPrice(item)}
                        onIncrement={() => addItem({
                          menuItemId: item.menuItemId,
                          name: item.name,
                          basePrice: item.basePrice,
                          imageUrl: item.imageUrl,
                          modifiers: [],
                        })}
                        onDecrement={() => decrementItem(item.menuItemId)}
                        onRemove={() => removeItem(item.menuItemId)}
                        onEdit={handleEditItem}
                        onUpdateModifier={(menuItemId, modifierId, type, delta) => {
                          updateModifierCount(menuItemId, modifierId, type, delta);
                        }}
                      />
                    ))}
                  </div>

                  {/* Итого */}
                  <div className="mt-6 border-t pt-4">
                    {/* Тип счёта */}
                    {billType && (
                      <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#f9fafb] p-3">
                        <span className="text-lg">
                          {billType === 'shared' ? '👥' : '👤'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#111827]">
                            {billType === 'shared' ? 'Совместный счёт' : 'Раздельный счёт'}
                          </p>
                          <p className="text-xs text-[#4b5563]">
                            {billType === 'shared' 
                              ? 'Все заказы за столом объединены' 
                              : 'Только ваши заказы'}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-xl font-bold text-[#111827]">
                      <span>{tCart('total')}</span>
                      <span>{totalPrice.toFixed(2)} ₽</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={handleCheckout}
                        className="w-full rounded-lg bg-[#2563eb] px-4 py-3 font-semibold text-[#ffffff] hover:bg-[#1d4ed8]"
                      >
                        {tCart('placeOrder')}
                      </button>
                      
                      {/* Кнопка оплаты если есть активные заказы */}
                      {(() => {
                        const currentOrderId = getCurrentOrderId(tableId, tableNumber);
                        
                        return currentOrderId && (
                          <button
                            onClick={() => {
                              setShowPaymentModal(true);
                              setIsOpen(false);
                            }}
                            className="w-full rounded-lg bg-[#16a34a] px-4 py-3 font-semibold text-[#ffffff] hover:bg-[#15803d]"
                          >
                            💳 Оплатить счёт
                          </button>
                        );
                      })()}
                      
                      <button
                        onClick={clearCart}
                        className="w-full rounded-lg border border-[#d1d5db] px-4 py-2 text-[#374151] hover:bg-[#f9fafb]"
                      >
                        {tCart('clearCart')}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Форма оформления */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#374151]">
                        Номер столика *
                      </label>
                      <input
                        type="text"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="Введите номер столика"
                        disabled={!!searchParams.get('table')}
                        className="mt-1 block w-full rounded-lg border border-[#d1d5db] px-3 py-2 shadow-sm focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] disabled:bg-[#f3f4f6]"
                      />
                      {searchParams.get('table') ? (
                        <p className="mt-1 text-xs text-[#16a34a]">
                          ✓ Столик определен автоматически через QR-код
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[#6b7280]">
                          Укажите номер столика, за которым вы сидите
                        </p>
                      )}
                    </div>

                    {error && (
                      <div className="rounded-lg bg-[#fef2f2] p-3 text-sm text-[#dc2626]">
                        {error}
                      </div>
                    )}

                    <CartSummary
                      items={items}
                      totalPrice={totalPrice}
                      getItemPrice={getItemPrice}
                      tableNumber={tableNumber}
                      onSubmit={handleSubmitOrder}
                      onBack={() => setIsCheckout(false)}
                      loading={loading}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования блюда */}
      {showEditModal && editingItemIndex !== null && items[editingItemIndex] && (
        <EditMenuItemModal
          menuItemId={items[editingItemIndex].menuItemId}
          name={items[editingItemIndex].name}
          imageUrl={items[editingItemIndex].imageUrl}
          initialModifiers={items[editingItemIndex].modifiers}
          onClose={() => {
            setShowEditModal(false);
            setEditingItemIndex(null);
          }}
          onSave={handleSaveEditedItem}
        />
      )}

      {/* Модальное окно оплаты */}
      {(() => {
        const currentOrderId = getCurrentOrderId(tableId, tableNumber);
        const orderId = currentOrderId || lastOrderId;
        
        return orderId && (
          <CheckoutModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            orderId={orderId}
            orderTotal={allOrdersTotal || totalPrice}
            myOrdersTotal={myOrdersTotal}
            isSharedBill={billType === 'shared'}
            tableNumber={tableNumber}
            onSuccess={() => {
              setShowPaymentModal(false);
              setSuccess(false);
              setLastOrderId('');
              // Очистить текущий заказ и billType из localStorage после оплаты
              if (typeof window !== 'undefined') {
                localStorage.removeItem('itresto-current-order');
                localStorage.removeItem('itresto-bill-type');
              }
              setOrdersRefreshKey(prev => prev + 1);
              router.refresh();
            }}
          />
        );
      })()}
    </>
  );
}
