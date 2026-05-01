import { pgTable, uuid, varchar, text, timestamp, integer, decimal, numeric, boolean, pgEnum, time, date, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', [
  'client',
  'waiter',
  'kitchen_staff',
  'bar_staff',
  'manager',
  'supervisor',
  'admin'
]);

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'login',
  'logout'
]);

export const tableStatusEnum = pgEnum('table_status', [
  'available',
  'reserved',
  'occupied'
]);

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
]);

export const orderItemStatusEnum = pgEnum('order_item_status', [
  'pending',
  'preparing',
  'partially_ready',
  'ready',
  'delivered',
  'cancelled'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'refunded'
]);

export const billTypeEnum = pgEnum('bill_type', [
  'shared',
  'separate'
]);

// Restaurants
export const restaurants = pgTable('restaurants', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  logoUrl: varchar('logo_url', { length: 500 }),
  themeConfig: text('theme_config'), // JSON string
  supportedContentLocales: text('supported_content_locales').array().default(['ru']).notNull(), // Available locales for menu content
  defaultContentLocale: varchar('default_content_locale', { length: 10 }).default('ru').notNull(), // Default locale for content
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  avatar: text('avatar'), // URL к фото профиля
  passwordHash: varchar('password_hash', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  middleName: varchar('middle_name', { length: 100 }),
  dateOfBirth: timestamp('date_of_birth'),
  role: userRoleEnum('role').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  deactivationReason: text('deactivation_reason'),
  deactivatedAt: timestamp('deactivated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tables
export const tables = pgTable('tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  number: varchar('table_number', { length: 20 }).notNull(),
  description: text('description'), // Описание расположения столика
  qrCode: text('qr_code'),
  status: tableStatusEnum('status').default('available').notNull(),
  capacity: integer('capacity').default(4),
  pin: varchar('pin', { length: 4 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Waiter Tables Assignment
export const waiterTables = pgTable('waiter_tables', {
  id: uuid('id').defaultRandom().primaryKey(),
  waiterId: uuid('waiter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  unassignedAt: timestamp('unassigned_at'),
});

// Waiter Calls
export const waiterCalls = pgTable('waiter_calls', {
  id: uuid('id').defaultRandom().primaryKey(),
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'cascade' }).notNull(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  waiterId: uuid('waiter_id').references(() => users.id, { onDelete: 'set null' }),
  message: text('message'),
  acknowledgedAt: timestamp('acknowledged_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Menu Categories
export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  translations: text('translations'), // JSONB stored as text: { locale: { name, description } }
  displayOrder: integer('display_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Menu Items
export const menuItemTypeEnum = pgEnum('menu_item_type', ['main', 'modifier']);

export const menuItems = pgTable('menu_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  categoryId: uuid('category_id').references(() => menuCategories.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  translations: text('translations'), // JSONB stored as text: { locale: { name, description } }
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }),
  calories: integer('calories'),
  proteins: integer('proteins'),
  fats: integer('fats'),
  carbohydrates: integer('carbohydrates'),
  prepDepartmentId: uuid('prep_department_id').references(() => departments.id, { onDelete: 'set null' }),
  prepTime: integer('prep_time_minutes'),
  type: menuItemTypeEnum('type').default('main').notNull(),
  isAvailable: boolean('is_available').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Orders
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
  tableNumber: varchar('table_number', { length: 20 }), // Номер стола для совместных счетов
  waiterId: uuid('waiter_id').references(() => users.id, { onDelete: 'set null' }),
  clientId: uuid('client_id').references(() => users.id, { onDelete: 'set null' }),
  guestDeviceId: uuid('guest_device_id'), // Will be set after guestDevices table is created
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  billType: billTypeEnum('bill_type').default('shared').notNull(),
  status: orderStatusEnum('status').default('pending').notNull(),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).default('0').notNull(),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0').notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).default('0').notNull(),
  tipAmount: decimal('tip_amount', { precision: 10, scale: 2 }).default('0'),
  tipPercent: integer('tip_percent'),
  paymentStatus: paymentStatusEnum('payment_status').default('pending').notNull(),
  paymentId: text('payment_id'), // Transaction ID from CloudPayments/Stripe
  paymentProvider: varchar('payment_provider', { length: 50 }), // cloudpayments, stripe, etc
  appliedPromotions: text('applied_promotions'), // JSON array of promotion IDs and details
  loyaltyPointsEarned: integer('loyalty_points_earned').default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Conflicts (для урег улирования конфликтных ситуаций)
export const conflicts = pgTable('conflicts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  discountType: varchar('discount_type', { length: 20 }), // 'percent' or 'amount'
  discountValue: decimal('discount_value', { precision: 10, scale: 2 }),
  resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending/resolved
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Order Items
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: uuid('menu_item_id').references(() => menuItems.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull(),
  quantityDelivered: integer('quantity_delivered').default(0).notNull(),
  priceAtOrder: decimal('price_at_order', { precision: 10, scale: 2 }).notNull(),
  status: orderItemStatusEnum('status').default('pending').notNull(),
  kitchenStatus: orderItemStatusEnum('kitchen_status').default('pending'),
  barStatus: orderItemStatusEnum('bar_status').default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Order Item Deliveries - отслеживание какой официант забрал какие блюда
export const orderItemDeliveries = pgTable('order_item_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderItemId: uuid('order_item_id').references(() => orderItems.id, { onDelete: 'cascade' }).notNull(),
  waiterId: uuid('waiter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(),
  pickedUpAt: timestamp('picked_up_at').defaultNow().notNull(),
});

// Modifier Groups - группы модификаторов (Гарниры, Соусы и т.д.)
export const modifierGroups = pgTable('modifier_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  translations: text('translations'), // JSONB stored as text: { locale: { name } }
  required: boolean('required').default(false).notNull(),
  multiSelect: boolean('multi_select').default(false).notNull(),
  minSelections: integer('min_selections').default(0).notNull(),
  maxSelections: integer('max_selections').default(1).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Modifiers - конкретные модификаторы в группе
export const modifiers = pgTable('modifiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  modifierGroupId: uuid('modifier_group_id').references(() => modifierGroups.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: uuid('menu_item_id').references(() => menuItems.id, { onDelete: 'cascade' }).notNull(),
  priceModifier: decimal('price_modifier', { precision: 10, scale: 2 }).default('0').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Menu Item Modifier Groups - связь основных блюд с группами модификаторов
export const menuItemModifierGroups = pgTable('menu_item_modifier_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  mainItemId: uuid('main_item_id').references(() => menuItems.id, { onDelete: 'cascade' }).notNull(),
  modifierGroupId: uuid('modifier_group_id').references(() => modifierGroups.id, { onDelete: 'cascade' }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Menu Item Available Modifiers - доступные модификаторы для конкретного блюда
export const menuItemAvailableModifiers = pgTable('menu_item_available_modifiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  mainItemId: uuid('main_item_id').references(() => menuItems.id, { onDelete: 'cascade' }).notNull(),
  modifierId: uuid('modifier_id').references(() => modifiers.id, { onDelete: 'cascade' }).notNull(),
  isDefaultForItem: boolean('is_default_for_item').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Order Item Modifiers - выбранные модификаторы для позиций заказа
export const orderItemModifiers = pgTable('order_item_modifiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderItemId: uuid('order_item_id').references(() => orderItems.id, { onDelete: 'cascade' }).notNull(),
  modifierId: uuid('modifier_id').references(() => modifiers.id, { onDelete: 'set null' }),
  quantity: integer('quantity').default(1).notNull(),
  priceModifier: decimal('price_modifier', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Reservations
export const reservations = pgTable('reservations', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'cascade' }).notNull(),
  clientId: uuid('client_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }), // Кто создал бронирование (менеджер/клиент)
  reservedFrom: timestamp('reserved_from').notNull(),
  reservedTo: timestamp('reserved_to').notNull(), // изменено с reservedUntil
  partySize: integer('party_size').notNull(), // изменено с guestCount
  notes: text('notes'),
  status: varchar('status', { length: 50 }).default('confirmed').notNull(), // confirmed/cancelled
  actualStartTime: timestamp('actual_start_time'), // когда клиент занял столик
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Loyalty Programs
export const loyaltyPrograms = pgTable('loyalty_programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  pointsPerRuble: decimal('points_per_ruble', { precision: 5, scale: 2 }).default('0.01').notNull(), // Коэффициент начисления баллов (например, 0.01 = 1 балл за 100 рублей)
  discountPercent: integer('discount_percent').default(0), // DEPRECATED: используйте loyalty_levels
  minOrdersRequired: integer('min_orders_required').default(0), // DEPRECATED: используйте loyalty_levels
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Loyalty Levels - уровни программы лояльности
export const loyaltyLevels = pgTable('loyalty_levels', {
  id: uuid('id').defaultRandom().primaryKey(),
  loyaltyProgramId: uuid('loyalty_program_id').references(() => loyaltyPrograms.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(), // Название уровня (например, "Бронза", "Серебро", "Золото")
  minPoints: integer('min_points').default(0).notNull(), // Минимальное количество баллов для достижения уровня
  discountPercent: integer('discount_percent').default(0).notNull(), // Процент скидки на этом уровне
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Client Loyalty
export const clientLoyalty = pgTable('client_loyalty', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  loyaltyProgramId: uuid('loyalty_program_id').references(() => loyaltyPrograms.id, { onDelete: 'cascade' }).notNull(),
  orderCount: integer('order_count').default(0).notNull(),
  totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0').notNull(),
  totalPoints: integer('total_points').default(0).notNull(), // Общее количество накопленных баллов
  currentLevelId: uuid('current_level_id').references(() => loyaltyLevels.id), // Текущий уровень клиента
  currentDiscountPercent: integer('current_discount_percent').default(0), // DEPRECATED: используйте currentLevelId
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// Promotion Types
export const promotionTypeEnum = pgEnum('promotion_type', [
  'all_menu',         // Скидка на все блюда меню
  'specific_item',    // Скидка на конкретное блюдо
  'bogo',             // Buy One Get One (купи N получи M)
  'time_based',       // Скидка по времени суток
  'birthday',         // Скидка в честь дня рождения
]);

// Promotions
export const promotions = pgTable('promotions', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  type: promotionTypeEnum('type').default('all_menu').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  discountPercent: integer('discount_percent'),
  discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }),
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until'), // Необязательно для бессрочных акций
  timeFrom: varchar('time_from', { length: 5 }), // HH:MM формат, например "10:00"
  timeTo: varchar('time_to', { length: 5 }), // HH:MM формат, например "14:00"
  forAllClients: boolean('for_all_clients').default(true).notNull(),
  clientId: uuid('client_id').references(() => users.id, { onDelete: 'cascade' }), // Для персональных акций
  eventType: varchar('event_type', { length: 50 }), // Тип события: 'birthday', 'anniversary', и т.д.
  birthdayPeriodDays: integer('birthday_period_days'), // Количество дней до и после дня рождения
  daysBeforeEvent: integer('days_before_event'), // DEPRECATED: использовать birthdayPeriodDays
  daysAfterEvent: integer('days_after_event'), // DEPRECATED: использовать birthdayPeriodDays
  rules: text('rules'), // JSONB для сложных правил (buy N get M, etc)
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Promotion Items - связь акций с конкретными блюдами
export const promotionItems = pgTable('promotion_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  promotionId: uuid('promotion_id').references(() => promotions.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: uuid('menu_item_id').references(() => menuItems.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Shifts
export const shifts = pgTable('shifts', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  managerId: uuid('manager_id').references(() => users.id, { onDelete: 'set null' }), // Назначенный менеджер смены
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Guest Devices (for unauthenticated users)
export const guestDevices = pgTable('guest_devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceUuid: varchar('device_uuid', { length: 255 }).notNull().unique(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  totalOrders: integer('total_orders').default(0).notNull(),
  totalSpent: decimal('total_spent', { precision: 10, scale: 2 }).default('0').notNull(),
  linkedClientId: uuid('linked_client_id').references(() => users.id, { onDelete: 'set null' }),
  linkedAt: timestamp('linked_at'),
});

// Roles - Кастомные роли для ресторана
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isSystem: boolean('is_system').default(false).notNull(), // Системная роль (не удаляемая)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Departments - Отделы ресторана
export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isFoodPreparation: boolean('is_food_preparation').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Roles - Связь пользователей с несколькими ролями
export const userRoles = pgTable('user_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
});

// User Departments - Связь пользователей с отделами
export const userDepartments = pgTable('user_departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
});

// Department Roles - Какие роли должны работать в отделе
export const departmentRoles = pgTable('department_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User Department Roles - Назначения сотрудников (Пользователь -> Отдел -> Роль)
export const userDepartmentRoles = pgTable('user_department_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
});

// Services - Услуги для ресторанов
export const services = pgTable('services', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).default('0').notNull(),
  isFree: boolean('is_free').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Restaurant Services - Подключенные услуги ресторана
export const restaurantServices = pgTable('restaurant_services', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  serviceId: uuid('service_id').references(() => services.id, { onDelete: 'cascade' }).notNull(),
  activatedAt: timestamp('activated_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});

// Audit Logs - Логирование действий
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: auditActionEnum('action').notNull(),
  entityType: varchar('entity_type', { length: 100 }), // 'user', 'menu_item', 'role', etc.
  entityId: uuid('entity_id'),
  changes: text('changes'), // JSON with before/after values
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Shift Management System

// Shift Templates - Шаблоны смен (переиспользуемые)
export const shiftTemplates = pgTable('shift_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  startTime: time('start_time').notNull(), // Время начала (09:00)
  durationHours: numeric('duration_hours', { precision: 5, scale: 2 }).notNull(), // Продолжительность в часах
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Shift Schedules - Расписание (привязка шаблона смены к конкретной дате)
export const shiftSchedules = pgTable('shift_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  shiftTemplateId: uuid('shift_template_id').references(() => shiftTemplates.id, { onDelete: 'set null' }),
  isDayOff: boolean('is_day_off').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Shift Staff Assignments - Назначение сотрудников на смены
export const shiftStaffAssignments = pgTable('shift_staff_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftScheduleId: uuid('shift_schedule_id').references(() => shiftSchedules.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  startTime: time('start_time').notNull(), // Время начала работы сотрудника
  durationHours: numeric('duration_hours', { precision: 5, scale: 2 }).notNull(), // Продолжительность работы
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Shift Table Assignments - Назначение официантов на столики в смене
export const shiftTableAssignments = pgTable('shift_table_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftScheduleId: uuid('shift_schedule_id').references(() => shiftSchedules.id, { onDelete: 'cascade' }).notNull(),
  shiftStaffAssignmentId: uuid('shift_staff_assignment_id').references(() => shiftStaffAssignments.id, { onDelete: 'cascade' }).notNull(),
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'cascade' }).notNull(),
  startTime: time('start_time').notNull(), // Время начала обслуживания столика
  durationHours: numeric('duration_hours', { precision: 5, scale: 2 }).notNull(), // Продолжительность обслуживания
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Shift Template Staff Assignments - Назначение сотрудников на шаблоны смен
export const shiftTemplateStaffAssignments = pgTable('shift_template_staff_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftTemplateId: uuid('shift_template_id').references(() => shiftTemplates.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  startTime: time('start_time').notNull(), // Время начала работы сотрудника в шаблоне
  durationHours: numeric('duration_hours', { precision: 5, scale: 2 }).notNull(), // Продолжительность работы
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Shift Template Table Assignments - Назначение официантов на столики в шаблонах смен
export const shiftTemplateTableAssignments = pgTable('shift_template_table_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftTemplateId: uuid('shift_template_id').references(() => shiftTemplates.id, { onDelete: 'cascade' }).notNull(),
  shiftTemplateStaffAssignmentId: uuid('shift_template_staff_assignment_id').references(() => shiftTemplateStaffAssignments.id, { onDelete: 'cascade' }).notNull(),
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'cascade' }).notNull(),
  startTime: time('start_time').notNull(), // Время начала обслуживания столика
  durationHours: numeric('duration_hours', { precision: 5, scale: 2 }).notNull(), // Продолжительность обслуживания
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Expo Push Tokens - Токены для мобильных push-уведомлений
export const expoPushTokens = pgTable('expo_push_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  deviceType: text('device_type'), // 'android', 'ios'
  deviceInfo: text('device_info'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Достижения (ачивки) - типы достижений
export const achievements = pgTable('achievements', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  icon: text('icon'), // URL или путь к иконке
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Достижения пользователей - связь юзеров с ачивками
export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  achievementId: uuid('achievement_id').references(() => achievements.id, { onDelete: 'cascade' }).notNull(),
  earnedAt: timestamp('earned_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Payment Settings - Настройки платежей для ресторана
export const paymentSettings = pgTable('payment_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  restaurantId: uuid('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull().unique(),
  publicKey: text('public_key'), // Public ID для CloudPayments или Publishable Key для Stripe
  secretKey: text('secret_key'), // API Secret для CloudPayments или Secret Key для Stripe
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  users: many(users),
  tables: many(tables),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
  orders: many(orders),
  loyaltyPrograms: many(loyaltyPrograms),
  promotions: many(promotions),
  reservations: many(reservations),
  shifts: many(shifts),
  shiftTemplates: many(shiftTemplates),
  shiftSchedules: many(shiftSchedules),
  guestDevices: many(guestDevices),
  roles: many(roles),
  departments: many(departments),
  services: many(restaurantServices),
  auditLogs: many(auditLogs),
  expoPushTokens: many(expoPushTokens),
  achievements: many(achievements),
  paymentSettings: one(paymentSettings),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [users.restaurantId],
    references: [restaurants.id],
  }),
  ordersAsWaiter: many(orders, { relationName: 'waiterOrders' }),
  ordersAsClient: many(orders, { relationName: 'clientOrders' }),
  waiterTables: many(waiterTables),
  clientLoyalty: many(clientLoyalty),
  promotions: many(promotions),
  reservations: many(reservations),
  shifts: many(shifts),
  shiftStaffAssignments: many(shiftStaffAssignments),
  userRoles: many(userRoles),
  userDepartments: many(userDepartments),
  userDepartmentRoles: many(userDepartmentRoles),
  auditLogs: many(auditLogs),
  expoPushTokens: many(expoPushTokens),
  userAchievements: many(userAchievements),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [tables.restaurantId],
    references: [restaurants.id],
  }),
  orders: many(orders),
  waiterTables: many(waiterTables),
  reservations: many(reservations),
  shiftTableAssignments: many(shiftTableAssignments),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [orders.restaurantId],
    references: [restaurants.id],
  }),
  table: one(tables, {
    fields: [orders.tableId],
    references: [tables.id],
  }),
  waiter: one(users, {
    fields: [orders.waiterId],
    references: [users.id],
    relationName: 'waiterOrders',
  }),
  client: one(users, {
    fields: [orders.clientId],
    references: [users.id],
    relationName: 'clientOrders',
  }),
  guestDevice: one(guestDevices, {
    fields: [orders.guestDeviceId],
    references: [guestDevices.id],
  }),
  orderItems: many(orderItems),
  conflicts: many(conflicts),
}));

export const conflictsRelations = relations(conflicts, ({ one }) => ({
  order: one(orders, {
    fields: [conflicts.orderId],
    references: [orders.id],
  }),
  resolvedByUser: one(users, {
    fields: [conflicts.resolvedBy],
    references: [users.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
  modifiers: many(orderItemModifiers),
  deliveries: many(orderItemDeliveries),
}));

export const orderItemDeliveriesRelations = relations(orderItemDeliveries, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [orderItemDeliveries.orderItemId],
    references: [orderItems.id],
  }),
  waiter: one(users, {
    fields: [orderItemDeliveries.waiterId],
    references: [users.id],
  }),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [menuItems.restaurantId],
    references: [restaurants.id],
  }),
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
  prepDepartment: one(departments, {
    fields: [menuItems.prepDepartmentId],
    references: [departments.id],
  }),
  orderItems: many(orderItems),
  modifiers: many(modifiers),
  modifierGroups: many(menuItemModifierGroups),
  promotionItems: many(promotionItems),
}));

export const waiterTablesRelations = relations(waiterTables, ({ one }) => ({
  waiter: one(users, {
    fields: [waiterTables.waiterId],
    references: [users.id],
  }),
  table: one(tables, {
    fields: [waiterTables.tableId],
    references: [tables.id],
  }),
}));

export const loyaltyProgramsRelations = relations(loyaltyPrograms, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [loyaltyPrograms.restaurantId],
    references: [restaurants.id],
  }),
  clientLoyalty: many(clientLoyalty),
  levels: many(loyaltyLevels),
}));

export const loyaltyLevelsRelations = relations(loyaltyLevels, ({ one }) => ({
  loyaltyProgram: one(loyaltyPrograms, {
    fields: [loyaltyLevels.loyaltyProgramId],
    references: [loyaltyPrograms.id],
  }),
}));

export const clientLoyaltyRelations = relations(clientLoyalty, ({ one }) => ({
  client: one(users, {
    fields: [clientLoyalty.clientId],
    references: [users.id],
  }),
  loyaltyProgram: one(loyaltyPrograms, {
    fields: [clientLoyalty.loyaltyProgramId],
    references: [loyaltyPrograms.id],
  }),
  currentLevel: one(loyaltyLevels, {
    fields: [clientLoyalty.currentLevelId],
    references: [loyaltyLevels.id],
  }),
}));

export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [promotions.restaurantId],
    references: [restaurants.id],
  }),
  client: one(users, {
    fields: [promotions.clientId],
    references: [users.id],
  }),
  items: many(promotionItems),
}));

export const promotionItemsRelations = relations(promotionItems, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionItems.promotionId],
    references: [promotions.id],
  }),
  menuItem: one(menuItems, {
    fields: [promotionItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const modifierGroupsRelations = relations(modifierGroups, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [modifierGroups.restaurantId],
    references: [restaurants.id],
  }),
  modifiers: many(modifiers),
  menuItemGroups: many(menuItemModifierGroups),
}));

export const modifiersRelations = relations(modifiers, ({ one, many }) => ({
  modifierGroup: one(modifierGroups, {
    fields: [modifiers.modifierGroupId],
    references: [modifierGroups.id],
  }),
  menuItem: one(menuItems, {
    fields: [modifiers.menuItemId],
    references: [menuItems.id],
  }),
  orderItemModifiers: many(orderItemModifiers),
}));

export const menuItemModifierGroupsRelations = relations(menuItemModifierGroups, ({ one }) => ({
  mainItem: one(menuItems, {
    fields: [menuItemModifierGroups.mainItemId],
    references: [menuItems.id],
  }),
  modifierGroup: one(modifierGroups, {
    fields: [menuItemModifierGroups.modifierGroupId],
    references: [modifierGroups.id],
  }),
}));

export const orderItemModifiersRelations = relations(orderItemModifiers, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [orderItemModifiers.orderItemId],
    references: [orderItems.id],
  }),
  modifier: one(modifiers, {
    fields: [orderItemModifiers.modifierId],
    references: [modifiers.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [reservations.restaurantId],
    references: [restaurants.id],
  }),
  table: one(tables, {
    fields: [reservations.tableId],
    references: [tables.id],
  }),
  client: one(users, {
    fields: [reservations.clientId],
    references: [users.id],
    relationName: 'clientReservations',
  }),
  creator: one(users, {
    fields: [reservations.createdBy],
    references: [users.id],
    relationName: 'createdReservations',
  }),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [shifts.restaurantId],
    references: [restaurants.id],
  }),
  user: one(users, {
    fields: [shifts.userId],
    references: [users.id],
  }),
  manager: one(users, {
    fields: [shifts.managerId],
    references: [users.id],
  }),
}));

export const waiterCallsRelations = relations(waiterCalls, ({ one }) => ({
  table: one(tables, {
    fields: [waiterCalls.tableId],
    references: [tables.id],
  }),
  waiter: one(users, {
    fields: [waiterCalls.waiterId],
    references: [users.id],
  }),
}));

export const guestDevicesRelations = relations(guestDevices, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [guestDevices.restaurantId],
    references: [restaurants.id],
  }),
  linkedClient: one(users, {
    fields: [guestDevices.linkedClientId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [roles.restaurantId],
    references: [restaurants.id],
  }),
  userRoles: many(userRoles),
  departmentRoles: many(departmentRoles),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [departments.restaurantId],
    references: [restaurants.id],
  }),
  userDepartments: many(userDepartments),
  departmentRoles: many(departmentRoles),
  shiftStaffAssignments: many(shiftStaffAssignments),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const userDepartmentsRelations = relations(userDepartments, ({ one }) => ({
  user: one(users, {
    fields: [userDepartments.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [userDepartments.departmentId],
    references: [departments.id],
  }),
}));

export const departmentRolesRelations = relations(departmentRoles, ({ one }) => ({
  department: one(departments, {
    fields: [departmentRoles.departmentId],
    references: [departments.id],
  }),
  role: one(roles, {
    fields: [departmentRoles.roleId],
    references: [roles.id],
  }),
}));

export const userDepartmentRolesRelations = relations(userDepartmentRoles, ({ one }) => ({
  user: one(users, {
    fields: [userDepartmentRoles.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [userDepartmentRoles.departmentId],
    references: [departments.id],
  }),
  role: one(roles, {
    fields: [userDepartmentRoles.roleId],
    references: [roles.id],
  }),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  restaurantServices: many(restaurantServices),
}));

export const restaurantServicesRelations = relations(restaurantServices, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [restaurantServices.restaurantId],
    references: [restaurants.id],
  }),
  service: one(services, {
    fields: [restaurantServices.serviceId],
    references: [services.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [auditLogs.restaurantId],
    references: [restaurants.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Shift Management Relations

export const shiftTemplatesRelations = relations(shiftTemplates, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [shiftTemplates.restaurantId],
    references: [restaurants.id],
  }),
  schedules: many(shiftSchedules),
  templateStaffAssignments: many(shiftTemplateStaffAssignments),
  templateTableAssignments: many(shiftTemplateTableAssignments),
}));

export const shiftSchedulesRelations = relations(shiftSchedules, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [shiftSchedules.restaurantId],
    references: [restaurants.id],
  }),
  shiftTemplate: one(shiftTemplates, {
    fields: [shiftSchedules.shiftTemplateId],
    references: [shiftTemplates.id],
  }),
  staffAssignments: many(shiftStaffAssignments),
  tableAssignments: many(shiftTableAssignments),
}));

export const shiftStaffAssignmentsRelations = relations(shiftStaffAssignments, ({ one, many }) => ({
  shiftSchedule: one(shiftSchedules, {
    fields: [shiftStaffAssignments.shiftScheduleId],
    references: [shiftSchedules.id],
  }),
  user: one(users, {
    fields: [shiftStaffAssignments.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [shiftStaffAssignments.departmentId],
    references: [departments.id],
  }),
  tableAssignments: many(shiftTableAssignments),
}));

export const shiftTableAssignmentsRelations = relations(shiftTableAssignments, ({ one }) => ({
  shiftSchedule: one(shiftSchedules, {
    fields: [shiftTableAssignments.shiftScheduleId],
    references: [shiftSchedules.id],
  }),
  staffAssignment: one(shiftStaffAssignments, {
    fields: [shiftTableAssignments.shiftStaffAssignmentId],
    references: [shiftStaffAssignments.id],
  }),
  table: one(tables, {
    fields: [shiftTableAssignments.tableId],
    references: [tables.id],
  }),
}));

export const shiftTemplateStaffAssignmentsRelations = relations(shiftTemplateStaffAssignments, ({ one, many }) => ({
  shiftTemplate: one(shiftTemplates, {
    fields: [shiftTemplateStaffAssignments.shiftTemplateId],
    references: [shiftTemplates.id],
  }),
  user: one(users, {
    fields: [shiftTemplateStaffAssignments.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [shiftTemplateStaffAssignments.departmentId],
    references: [departments.id],
  }),
  tableAssignments: many(shiftTemplateTableAssignments),
}));

export const shiftTemplateTableAssignmentsRelations = relations(shiftTemplateTableAssignments, ({ one }) => ({
  shiftTemplate: one(shiftTemplates, {
    fields: [shiftTemplateTableAssignments.shiftTemplateId],
    references: [shiftTemplates.id],
  }),
  staffAssignment: one(shiftTemplateStaffAssignments, {
    fields: [shiftTemplateTableAssignments.shiftTemplateStaffAssignmentId],
    references: [shiftTemplateStaffAssignments.id],
  }),
  table: one(tables, {
    fields: [shiftTemplateTableAssignments.tableId],
    references: [tables.id],
  }),
}));

export const expoPushTokensRelations = relations(expoPushTokens, ({ one }) => ({
  user: one(users, {
    fields: [expoPushTokens.userId],
    references: [users.id],
  }),
  restaurant: one(restaurants, {
    fields: [expoPushTokens.restaurantId],
    references: [restaurants.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [achievements.restaurantId],
    references: [restaurants.id],
  }),
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export const paymentSettingsRelations = relations(paymentSettings, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [paymentSettings.restaurantId],
    references: [restaurants.id],
  }),
}));

// ========================
// Demo Restaurant Tables
// ========================

// Счетчик для генерации номеров демо-ресторанов (test1, test2, test3...)
export const demoCounter = pgTable('demo_counter', {
  id: serial('id').primaryKey().default(1),
  currentNumber: integer('current_number').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Ограничения по IP для создания демо-ресторанов
export const demoRateLimits = pgTable('demo_rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  ipAddress: text('ip_address').notNull().unique(),
  countToday: integer('count_today').notNull().default(1),
  lastCreatedAt: timestamp('last_created_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
