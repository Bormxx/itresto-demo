export type UserRole = 
  | 'client'
  | 'waiter'
  | 'kitchen_staff'
  | 'manager'
  | 'supervisor'
  | 'admin';

export type TableStatus = 'available' | 'reserved' | 'occupied';

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type OrderItemStatus = 
  | 'pending'
  | 'preparing'
  | 'partially_ready'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type BillType = 'shared' | 'separate';

export type MenuItemType = 'main' | 'modifier';

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: string;
  buttonStyle: 'rounded' | 'square';
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logoUrl?: string;
  themeConfig?: ThemeConfig;
  supportedContentLocales: string[];
  defaultContentLocale: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  restaurantId?: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  dateOfBirth?: Date;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Table {
  id: string;
  restaurantId: string;
  number: string;
  qrCode?: string;
  status: TableStatus;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId?: string;
  name: string;
  description?: string;
  translations?: string | Record<string, { name: string; description?: string }>;
  price: string;
  imageUrl?: string;
  prepDepartmentId?: string | null;
  prepTime?: number;
  type: MenuItemType;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  translations?: string | Record<string, { name: string; description?: string }>;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ModifierGroup {
  id: string;
  restaurantId: string;
  name: string;
  translations?: string | Record<string, { name: string }>;
  required: boolean;
  multiSelect: boolean;
  minSelections: number;
  maxSelections: number;
  sortOrder: number;
  modifiers?: Modifier[];
}

export interface Modifier {
  id: string;
  modifierGroupId: string;
  menuItemId: string;
  menuItem?: MenuItem;
  priceModifier: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface CartItemModifier {
  modifierId: string;
  priceModifier: number;
  name?: string;
  isDefault?: boolean;
  // Для дефолтных модификаторов:
  //   - removedCount = количество блюд, где модификатор убран (quantity = 0)
  //   - addedCount = количество ДОПОЛНИТЕЛЬНЫХ порций сверх стандарта (quantity > 1)
  // Для недефолтных модификаторов:
  //   - addedCount = количество блюд, где модификатор добавлен (quantity >= 1)
  removedCount?: number;
  addedCount?: number;
}

// Тип для входящих модификаторов (с quantity)
export interface ModifierInput {
  modifierId: string;
  priceModifier: number;
  name?: string;
  isDefault?: boolean;
  quantity: number;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  basePrice: string; // базовая цена одного блюда (для расчета)
  imageUrl?: string;
  quantity: number; // общее количество блюд этого типа
  modifiers?: CartItemModifier[];
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId?: string;
  waiterId?: string;
  clientId?: string;
  orderNumber: string;
  billType: BillType;
  status: OrderStatus;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  tipAmount?: string;
  tipPercent?: number;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId?: string;
  quantity: number;
  quantityDelivered: number;
  priceAtOrder: string;
  status: OrderItemStatus;
  kitchenStatus?: OrderItemStatus;
  barStatus?: OrderItemStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
