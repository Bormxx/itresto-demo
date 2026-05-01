import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartItemModifier, ModifierInput } from '@/types';

export type BillType = 'shared' | 'separate';

interface AddItemInput {
  menuItemId: string;
  name: string;
  basePrice: string;
  imageUrl?: string;
  modifiers?: ModifierInput[];
}

interface CartStore {
  items: CartItem[];
  billType: BillType | null;
  billTypeAsked: boolean;
  setBillType: (billType: BillType) => void;
  resetBillType: () => void;
  addItem: (item: AddItemInput) => void;
  decrementItem: (menuItemId: string) => void;
  removeItem: (menuItemId: string) => void;
  updateModifierCount: (menuItemId: string, modifierId: string, type: 'added' | 'removed', delta: number) => void;
  getItemPrice: (item: CartItem) => number;
  clearCart: () => void;
  clearItems: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => {
      return {
        items: [],
        billType: null,
        billTypeAsked: false,

        setBillType: (billType) => {
          set({ billType, billTypeAsked: true });
        },

        resetBillType: () => {
          set({ billType: null, billTypeAsked: false });
          // Очистить из localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('itresto-bill-type');
          }
        },
  
        addItem: (item) => {
          set((state) => {
            // Ищем существующую позицию по menuItemId
            const existingItemIndex = state.items.findIndex((i) => i.menuItemId === item.menuItemId);
            
            if (existingItemIndex === -1) {
              // Позиция не найдена - создаем новую
              const newModifiers: CartItemModifier[] = item.modifiers?.map(mod => {
                if (mod.isDefault) {
                  // Дефолтный модификатор
                  return {
                    modifierId: mod.modifierId,
                    priceModifier: mod.priceModifier,
                    name: mod.name,
                    isDefault: true,
                    removedCount: mod.quantity === 0 ? 1 : 0,
                    addedCount: mod.quantity > 1 ? (mod.quantity - 1) : 0,
                  };
                } else {
                  // Недефолтный модификатор
                  return {
                    modifierId: mod.modifierId,
                    priceModifier: mod.priceModifier,
                    name: mod.name,
                    isDefault: false,
                    addedCount: mod.quantity > 0 ? mod.quantity : 0,
                  };
                }
              }) || [];
              
              return {
                items: [
                  ...state.items,
                  {
                    menuItemId: item.menuItemId,
                    name: item.name,
                    basePrice: item.basePrice,
                    imageUrl: item.imageUrl,
                    quantity: 1,
                    modifiers: newModifiers,
                  },
                ],
              };
            }
            
            // Позиция найдена - объединяем
            const existingItem = state.items[existingItemIndex];
            const updatedItem = { ...existingItem };
            updatedItem.quantity += 1;
            
            // Обрабатываем модификаторы добавляемого блюда
            if (item.modifiers) {
              for (const addedMod of item.modifiers) {
                // Ищем этот модификатор в существующей позиции
                const existingMod = updatedItem.modifiers?.find(m => m.modifierId === addedMod.modifierId);
                
                if (existingMod) {
                  // Модификатор уже есть - обновляем счетчики
                  if (addedMod.isDefault) {
                    // Дефолтный модификатор
                    if (addedMod.quantity === 0) {
                      // Модификатор убран - увеличиваем removedCount
                      existingMod.removedCount = (existingMod.removedCount || 0) + 1;
                    } else if (addedMod.quantity > 1) {
                      // Дефолтный модификатор добавлен в увеличенном количестве
                      existingMod.addedCount = (existingMod.addedCount || 0) + (addedMod.quantity - 1);
                    }
                    // Если quantity === 1, ничего не делаем (блюдо с дефолтным модификатором)
                  } else {
                    // Недефолтный модификатор
                    if (addedMod.quantity > 0) {
                      // Модификатор добавлен - увеличиваем addedCount
                      existingMod.addedCount = (existingMod.addedCount || 0) + addedMod.quantity;
                    }
                  }
                } else {
                  // Модификатора еще нет - добавляем его
                  if (!updatedItem.modifiers) {
                    updatedItem.modifiers = [];
                  }
                  
                  if (addedMod.isDefault) {
                    updatedItem.modifiers.push({
                      modifierId: addedMod.modifierId,
                      priceModifier: addedMod.priceModifier,
                      name: addedMod.name,
                      isDefault: true,
                      removedCount: addedMod.quantity === 0 ? 1 : 0,
                      addedCount: addedMod.quantity > 1 ? (addedMod.quantity - 1) : 0,
                    });
                  } else {
                    if (addedMod.quantity > 0) {
                      updatedItem.modifiers.push({
                        modifierId: addedMod.modifierId,
                        priceModifier: addedMod.priceModifier,
                        name: addedMod.name,
                        isDefault: false,
                        addedCount: addedMod.quantity,
                      });
                    }
                  }
                }
              }
            }
            
            const newItems = [...state.items];
            newItems[existingItemIndex] = updatedItem;
            
            return { items: newItems };
          });
        },
        
        decrementItem: (menuItemId) => {
          set((state) => {
            const itemIndex = state.items.findIndex((i) => i.menuItemId === menuItemId);
            
            if (itemIndex === -1) return state;
            
            const item = state.items[itemIndex];
            
            // Если quantity === 1, удаляем позицию полностью
            if (item.quantity === 1) {
              const newItems = state.items.filter((_, idx) => idx !== itemIndex);
              
              // Если корзина стала пустой, сбрасываем тип счёта
              if (newItems.length === 0) {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('itresto-bill-type');
                }
                return {
                  items: newItems,
                  billType: null,
                  billTypeAsked: false,
                };
              }
              
              return { items: newItems };
            }
            
            // quantity > 1 - уменьшаем с учетом дефолтных модификаторов
            const updatedItem = { ...item };
            
            // Проверяем есть ли блюда с дефолтными модификаторами
            let hasDefaultVariant = true;
            
            if (updatedItem.modifiers) {
              for (const mod of updatedItem.modifiers) {
                if (mod.isDefault) {
                  const removedCount = mod.removedCount || 0;
                  const defaultCount = updatedItem.quantity - removedCount;
                  
                  if (defaultCount > 0) {
                    // Есть блюда с дефолтом - просто уменьшаем quantity
                    // removedCount НЕ меняется
                    hasDefaultVariant = true;
                  } else {
                    // Все блюда кастомные (без этого дефолта)
                    hasDefaultVariant = false;
                  }
                  break; // Достаточно проверить один дефолтный модификатор
                }
              }
            }
            
            updatedItem.quantity -= 1;
            
            // Если удаляем кастомное блюдо, уменьшаем removedCount
            if (!hasDefaultVariant && updatedItem.modifiers) {
              for (const mod of updatedItem.modifiers) {
                if (mod.isDefault && mod.removedCount && mod.removedCount > 0) {
                  mod.removedCount -= 1;
                }
              }
            }
            
            const newItems = [...state.items];
            newItems[itemIndex] = updatedItem;
            
            return { items: newItems };
          });
        },
        
        updateModifierCount: (menuItemId, modifierId, type, delta) => {
          set((state) => {
            const itemIndex = state.items.findIndex((i) => i.menuItemId === menuItemId);
            
            if (itemIndex === -1) return state;
            
            const item = state.items[itemIndex];
            const updatedItem = { ...item };
            
            if (!updatedItem.modifiers) return state;
            
            updatedItem.modifiers = updatedItem.modifiers.map(mod => {
              if (mod.modifierId !== modifierId) return mod;
              
              const updatedMod = { ...mod };
              
              if (type === 'added') {
                // Работаем с addedCount (дополнительные порции)
                const currentAdded = mod.addedCount || 0;
                updatedMod.addedCount = Math.max(0, currentAdded + delta);
                // Если переключаемся на added, сбрасываем removed
                if (updatedMod.addedCount > 0) {
                  updatedMod.removedCount = 0;
                }
              } else {
                // Работаем с removedCount (убран)
                const currentRemoved = mod.removedCount || 0;
                const newRemoved = Math.max(0, Math.min(updatedItem.quantity, currentRemoved + delta));
                updatedMod.removedCount = newRemoved;
                // Если переключаемся на removed, сбрасываем added
                if (updatedMod.removedCount > 0) {
                  updatedMod.addedCount = 0;
                }
              }
              
              return updatedMod;
            }).filter(mod => {
              // Недефолтные модификаторы: удаляем только если addedCount = 0
              if (!mod.isDefault && (!mod.addedCount || mod.addedCount === 0)) {
                return false;
              }
              // Дефолтные модификаторы: ВСЕГДА оставляем (не фильтруем)
              // Они могут иметь removedCount, addedCount или быть в стандартном состоянии
              return true;
            });
            
            const newItems = [...state.items];
            newItems[itemIndex] = updatedItem;
            
            return { items: newItems };
          });
        },
  
  removeItem: (menuItemId) => {
    set((state) => {
      const newItems = state.items.filter((i) => i.menuItemId !== menuItemId);
      
      // Если корзина стала пустой, сбрасываем тип счёта
      if (newItems.length === 0) {
        // Очистить billType из localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('itresto-bill-type');
        }
        
        return {
          items: newItems,
          billType: null,
          billTypeAsked: false,
        };
      }
      
      return {
        items: newItems,
      };
    });
  },
  
        getItemPrice: (item) => {
          const basePrice = parseFloat(item.basePrice);
          let totalPrice = basePrice * item.quantity;
          
          if (item.modifiers) {
            for (const modifier of item.modifiers) {
              if (modifier.isDefault) {
                // Дефолтный модификатор:
                // - Вычитаем за каждое удаление (removedCount)
                // - Добавляем за каждую дополнительную порцию (addedCount)
                const removedCount = modifier.removedCount || 0;
                const addedCount = modifier.addedCount || 0;
                totalPrice -= modifier.priceModifier * removedCount;
                totalPrice += modifier.priceModifier * addedCount;
              } else {
                // Недефолтный модификатор - добавляем за каждое добавление
                const addedCount = modifier.addedCount || 0;
                totalPrice += modifier.priceModifier * addedCount;
              }
            }
          }
          
          return totalPrice;
        },
  
  clearCart: () => {
    set({ items: [], billType: null, billTypeAsked: false });
  },
  
  clearItems: () => {
    set({ items: [] });
  },
  
  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },
  
  getTotalPrice: () => {
    const { items, getItemPrice } = get();
    return items.reduce((total, item) => {
      return total + getItemPrice(item);
    }, 0);
  },
      };
    },
    {
      name: 'itresto-cart-storage',
    }
  )
);
