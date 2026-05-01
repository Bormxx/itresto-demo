import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Restaurants
export const restaurants = sqliteTable('restaurants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text('slug', { length: 100 }).notNull().unique(),
  name: text('name', { length: 255 }).notNull(),
  description: text('description'),
  logoUrl: text('logo_url', { length: 500 }),
  themeConfig: text('theme_config'), // JSON string
  supportedContentLocales: text('supported_content_locales').default('["ru"]').notNull(), // JSON array
  defaultContentLocale: text('default_content_locale', { length: 10 }).default('ru').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Users
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }),
  email: text('email', { length: 255 }).notNull(),
  phone: text('phone', { length: 20 }),
  avatar: text('avatar'),
  passwordHash: text('password_hash', { length: 255 }),
  firstName: text('first_name', { length: 100 }),
  lastName: text('last_name', { length: 100 }),
  middleName: text('middle_name', { length: 100 }),
  dateOfBirth: integer('date_of_birth', { mode: 'timestamp' }),
  role: text('role').notNull(), // 'client', 'waiter', 'kitchen_staff', 'bar_staff', 'manager', 'supervisor', 'admin'
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  deactivationReason: text('deactivation_reason'),
  deactivatedAt: integer('deactivated_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Tables
export const tables = sqliteTable('tables', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  number: text('table_number', { length: 20 }).notNull(),
  description: text('description'),
  qrCode: text('qr_code'),
  status: text('status').default('available').notNull(), // 'available', 'reserved', 'occupied'
  capacity: integer('capacity').default(4),
  pin: text('pin', { length: 4 }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Waiter Tables Assignment
export const waiterTables = sqliteTable('waiter_tables', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  waiterId: text('waiter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tableId: text('table_id').references(() => tables.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: integer('assigned_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  unassignedAt: integer('unassigned_at', { mode: 'timestamp' }),
});

// Waiter Calls
export const waiterCalls = sqliteTable('waiter_calls', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tableId: text('table_id').references(() => tables.id, { onDelete: 'cascade' }).notNull(),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  waiterId: text('waiter_id').references(() => users.id, { onDelete: 'set null' }),
  message: text('message'),
  acknowledgedAt: integer('acknowledged_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Departments
export const departments = sqliteTable('departments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name', { length: 255 }).notNull(),
  description: text('description'),
  orderPrinterId: text('order_printer_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Menu Categories
export const menuCategories = sqliteTable('menu_categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name', { length: 255 }).notNull(),
  description: text('description'),
  translations: text('translations'), // JSON: { locale: { name, description } }
  displayOrder: integer('display_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Menu Items
export const menuItems = sqliteTable('menu_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  categoryId: text('category_id').references(() => menuCategories.id, { onDelete: 'set null' }),
  name: text('name', { length: 255 }).notNull(),
  description: text('description'),
  translations: text('translations'), // JSON: { locale: { name, description } }
  price: real('price').notNull(),
  imageUrl: text('image_url', { length: 500 }),
  calories: integer('calories'),
  proteins: integer('proteins'),
  fats: integer('fats'),
  carbohydrates: integer('carbohydrates'),
  prepDepartmentId: text('prep_department_id').references(() => departments.id, { onDelete: 'set null' }),
  prepTime: integer('prep_time_minutes'),
  type: text('type').default('main').notNull(), // 'main', 'modifier'
  isAvailable: integer('is_available', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Orders
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  tableId: text('table_id').references(() => tables.id, { onDelete: 'set null' }),
  tableNumber: text('table_number', { length: 20 }),
  waiterId: text('waiter_id').references(() => users.id, { onDelete: 'set null' }),
  clientId: text('client_id').references(() => users.id, { onDelete: 'set null' }),
  guestDeviceId: text('guest_device_id'),
  orderNumber: text('order_number', { length: 50 }).notNull(),
  billType: text('bill_type').default('shared').notNull(), // 'shared', 'separate'
  status: text('status').default('pending').notNull(), // 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'
  subtotal: real('subtotal').default(0).notNull(),
  discount: real('discount').default(0).notNull(),
  tax: real('tax').default(0).notNull(),
  total: real('total').default(0).notNull(),
  tipAmount: real('tip_amount').default(0),
  tipPercent: integer('tip_percent'),
  paymentStatus: text('payment_status').default('pending').notNull(), // 'pending', 'paid', 'failed', 'refunded'
  paymentId: text('payment_id'),
  paymentProvider: text('payment_provider', { length: 50 }),
  appliedPromotions: text('applied_promotions'), // JSON array
  loyaltyPointsEarned: integer('loyalty_points_earned').default(0),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// Conflicts
export const conflicts = sqliteTable('conflicts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  discountType: text('discount_type', { length: 20 }), // 'percent' or 'amount'
  discountValue: real('discount_value'),
  resolvedBy: text('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  status: text('status', { length: 50 }).default('pending').notNull(), // pending/resolved
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Order Items
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: text('menu_item_id').references(() => menuItems.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull(),
  quantityDelivered: integer('quantity_delivered').default(0).notNull(),
  priceAtOrder: real('price_at_order').notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'preparing', 'partially_ready', 'ready', 'delivered', 'cancelled'
  kitchenStatus: text('kitchen_status').default('pending'),
  barStatus: text('bar_status').default('pending'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Order Item Deliveries
export const orderItemDeliveries = sqliteTable('order_item_deliveries', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderItemId: text('order_item_id').references(() => orderItems.id, { onDelete: 'cascade' }).notNull(),
  waiterId: text('waiter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(),
  pickedUpAt: integer('picked_up_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Modifier Groups
export const modifierGroups = sqliteTable('modifier_groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name', { length: 255 }).notNull(),
  translations: text('translations'), // JSON: { locale: { name } }
  required: integer('required', { mode: 'boolean' }).default(false).notNull(),
  multiSelect: integer('multi_select', { mode: 'boolean' }).default(false).notNull(),
  minSelections: integer('min_selections').default(0).notNull(),
  maxSelections: integer('max_selections').default(1).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Modifiers
export const modifiers = sqliteTable('modifiers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  modifierGroupId: text('modifier_group_id').references(() => modifierGroups.id, { onDelete: 'cascade' }).notNull(),
  menuItemId: text('menu_item_id').references(() => menuItems.id, { onDelete: 'set null' }),
  name: text('name', { length: 255 }).notNull(),
  price: real('price').default(0).notNull(),
  translations: text('translations'), // JSON: { locale: { name } }
  isAvailable: integer('is_available', { mode: 'boolean' }).default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Menu Item Modifier Groups
export const menuItemModifierGroups = sqliteTable('menu_item_modifier_groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  menuItemId: text('menu_item_id').references(() => menuItems.id, { onDelete: 'cascade' }).notNull(),
  modifierGroupId: text('modifier_group_id').references(() => modifierGroups.id, { onDelete: 'cascade' }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Menu Item Available Modifiers
export const menuItemAvailableModifiers = sqliteTable('menu_item_available_modifiers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  menuItemId: text('menu_item_id').references(() => menuItems.id, { onDelete: 'cascade' }).notNull(),
  modifierId: text('modifier_id').references(() => modifiers.id, { onDelete: 'cascade' }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Order Item Modifiers
export const orderItemModifiers = sqliteTable('order_item_modifiers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderItemId: text('order_item_id').references(() => orderItems.id, { onDelete: 'cascade' }).notNull(),
  modifierId: text('modifier_id').references(() => modifiers.id, { onDelete: 'set null' }),
  name: text('name', { length: 255 }).notNull(),
  priceAtOrder: real('price_at_order').default(0).notNull(),
});

// Shifts
export const shifts = sqliteTable('shifts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name', { length: 255 }).notNull(),
  startTime: integer('start_time', { mode: 'timestamp' }).notNull(),
  endTime: integer('end_time', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Services
export const services = sqliteTable('services', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name', { length: 255 }).notNull(),
  description: text('description'),
  serviceKey: text('service_key', { length: 100 }).notNull().unique(),
  isCore: integer('is_core', { mode: 'boolean' }).default(false).notNull(),
  displayOrder: integer('display_order').default(999).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Restaurant Services
export const restaurantServices = sqliteTable('restaurant_services', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  serviceId: text('service_id').references(() => services.id, { onDelete: 'cascade' }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  activatedAt: integer('activated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
});

// Guest Devices
export const guestDevices = sqliteTable('guest_devices', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  tableId: text('table_id').references(() => tables.id, { onDelete: 'set null' }),
  deviceFingerprint: text('device_fingerprint', { length: 255 }).notNull(),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Audit Logs
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  restaurantId: text('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // 'create', 'update', 'delete', 'login', 'logout'
  resourceType: text('resource_type', { length: 100 }),
  resourceId: text('resource_id'),
  details: text('details'), // JSON
  ipAddress: text('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Demo Counter (для генерации номеров демо)
export const demoCounter = sqliteTable('demo_counter', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  currentNumber: integer('current_number').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Demo Rate Limits (ограничение создания демо)
export const demoRateLimits = sqliteTable('demo_rate_limits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  ipAddress: text('ip_address', { length: 45 }).notNull().unique(),
  countToday: integer('count_today').notNull().default(0),
  lastCreatedAt: integer('last_created_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Relations (optional, для удобства работы с ORM)
export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  users: many(users),
  tables: many(tables),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
  orders: many(orders),
}));

export const usersRelations = relations(users, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [users.restaurantId],
    references: [restaurants.id],
  }),
}));

export const tablesRelations = relations(tables, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [tables.restaurantId],
    references: [restaurants.id],
  }),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [menuCategories.restaurantId],
    references: [restaurants.id],
  }),
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [menuItems.restaurantId],
    references: [restaurants.id],
  }),
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
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
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

// ============================================================================
// STUB TABLES - для совместимости с кодом, не используются в демо
// ============================================================================

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
});

export const clientLoyalty = sqliteTable('client_loyalty', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  points: integer('points').notNull().default(0),
});

export const departmentRoles = sqliteTable('department_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  departmentId: text('department_id').notNull(),
});

export const expoPushTokens = sqliteTable('expo_push_tokens', {
  id: text('id').primaryKey(),
  token: text('token').notNull(),
  userId: text('user_id'),
});

export const loyaltyLevels = sqliteTable('loyalty_levels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  minPoints: integer('min_points').notNull(),
});

export const loyaltyPrograms = sqliteTable('loyalty_programs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
});

export const paymentSettings = sqliteTable('payment_settings', {
  id: text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  provider: text('provider').notNull(),
});

export const promotionItems = sqliteTable('promotion_items', {
  id: text('id').primaryKey(),
  promotionId: text('promotion_id').notNull(),
  menuItemId: text('menu_item_id').notNull(),
});

export const promotions = sqliteTable('promotions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  restaurantId: text('restaurant_id').notNull(),
});

export const reservations = sqliteTable('reservations', {
  id: text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  guestName: text('guest_name').notNull(),
  guestPhone: text('guest_phone'),
  tableId: text('table_id'),
  date: text('date').notNull(),
  time: text('time').notNull(),
  guestCount: integer('guest_count').notNull(),
  status: text('status').notNull().default('pending'),
});

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
});

export const shiftSchedules = sqliteTable('shift_schedules', {
  id: text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  date: text('date').notNull(),
  shiftType: text('shift_type').notNull(),
});

export const shiftStaffAssignments = sqliteTable('shift_staff_assignments', {
  id: text('id').primaryKey(),
  shiftId: text('shift_id').notNull(),
  userId: text('user_id').notNull(),
});

export const shiftTableAssignments = sqliteTable('shift_table_assignments', {
  id: text('id').primaryKey(),
  shiftId: text('shift_id').notNull(),
  tableId: text('table_id').notNull(),
  userId: text('user_id'),
});

export const shiftTemplates = sqliteTable('shift_templates', {
  id: text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  name: text('name').notNull(),
  dayOfWeek: integer('day_of_week'),
});

export const shiftTemplateStaffAssignments = sqliteTable('shift_template_staff_assignments', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull(),
  userId: text('user_id').notNull(),
});

export const shiftTemplateTableAssignments = sqliteTable('shift_template_table_assignments', {
  id: text('id').primaryKey(),
  templateId: text('template_id').notNull(),
  tableId: text('table_id').notNull(),
});

export const userAchievements = sqliteTable('user_achievements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  achievementId: text('achievement_id').notNull(),
});

export const userDepartmentRoles = sqliteTable('user_department_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  departmentId: text('department_id').notNull(),
  roleId: text('role_id').notNull(),
});
