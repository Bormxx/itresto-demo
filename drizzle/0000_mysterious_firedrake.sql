CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`resource_type` text(100),
	`resource_id` text,
	`details` text,
	`ip_address` text(45),
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `conflicts` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`description` text NOT NULL,
	`discount_type` text(20),
	`discount_value` real,
	`resolved_by` text,
	`status` text(50) DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `demo_counter` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`last_number` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `demo_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`ip_address` text(45) NOT NULL,
	`last_created_at` integer NOT NULL,
	`created_today` integer DEFAULT 0 NOT NULL,
	`today_date` text(10) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `demo_rate_limits_ip_address_unique` ON `demo_rate_limits` (`ip_address`);--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text(255) NOT NULL,
	`description` text,
	`order_printer_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `guest_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`table_id` text,
	`device_fingerprint` text(255) NOT NULL,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `menu_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text(255) NOT NULL,
	`description` text,
	`translations` text,
	`display_order` integer DEFAULT 0,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `menu_item_available_modifiers` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_item_id` text NOT NULL,
	`modifier_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`modifier_id`) REFERENCES `modifiers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `menu_item_modifier_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_item_id` text NOT NULL,
	`modifier_group_id` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`modifier_group_id`) REFERENCES `modifier_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`category_id` text,
	`name` text(255) NOT NULL,
	`description` text,
	`translations` text,
	`price` real NOT NULL,
	`image_url` text(500),
	`calories` integer,
	`proteins` integer,
	`fats` integer,
	`carbohydrates` integer,
	`prep_department_id` text,
	`prep_time_minutes` integer,
	`type` text DEFAULT 'main' NOT NULL,
	`is_available` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `menu_categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`prep_department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `modifier_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text(255) NOT NULL,
	`translations` text,
	`required` integer DEFAULT false NOT NULL,
	`multi_select` integer DEFAULT false NOT NULL,
	`min_selections` integer DEFAULT 0 NOT NULL,
	`max_selections` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `modifiers` (
	`id` text PRIMARY KEY NOT NULL,
	`modifier_group_id` text NOT NULL,
	`menu_item_id` text,
	`name` text(255) NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`translations` text,
	`is_available` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`modifier_group_id`) REFERENCES `modifier_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `order_item_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`order_item_id` text NOT NULL,
	`waiter_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`picked_up_at` integer NOT NULL,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`waiter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `order_item_modifiers` (
	`id` text PRIMARY KEY NOT NULL,
	`order_item_id` text NOT NULL,
	`modifier_id` text,
	`name` text(255) NOT NULL,
	`price_at_order` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`modifier_id`) REFERENCES `modifiers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`menu_item_id` text,
	`quantity` integer NOT NULL,
	`quantity_delivered` integer DEFAULT 0 NOT NULL,
	`price_at_order` real NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`kitchen_status` text DEFAULT 'pending',
	`bar_status` text DEFAULT 'pending',
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`table_id` text,
	`table_number` text(20),
	`waiter_id` text,
	`client_id` text,
	`guest_device_id` text,
	`order_number` text(50) NOT NULL,
	`bill_type` text DEFAULT 'shared' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`tax` real DEFAULT 0 NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`tip_amount` real DEFAULT 0,
	`tip_percent` integer,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`payment_id` text,
	`payment_provider` text(50),
	`applied_promotions` text,
	`loyalty_points_earned` integer DEFAULT 0,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`waiter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `restaurant_services` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`service_id` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`activated_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text(100) NOT NULL,
	`name` text(255) NOT NULL,
	`description` text,
	`logo_url` text(500),
	`theme_config` text,
	`supported_content_locales` text DEFAULT '["ru"]' NOT NULL,
	`default_content_locale` text(10) DEFAULT 'ru' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restaurants_slug_unique` ON `restaurants` (`slug`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text(255) NOT NULL,
	`description` text,
	`service_key` text(100) NOT NULL,
	`is_core` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 999 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `services_service_key_unique` ON `services` (`service_key`);--> statement-breakpoint
CREATE TABLE `shifts` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text(255) NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`table_number` text(20) NOT NULL,
	`description` text,
	`qr_code` text,
	`status` text DEFAULT 'available' NOT NULL,
	`capacity` integer DEFAULT 4,
	`pin` text(4),
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text,
	`email` text(255) NOT NULL,
	`phone` text(20),
	`avatar` text,
	`password_hash` text(255),
	`first_name` text(100),
	`last_name` text(100),
	`middle_name` text(100),
	`date_of_birth` integer,
	`role` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`deactivation_reason` text,
	`deactivated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `waiter_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`table_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`waiter_id` text,
	`message` text,
	`acknowledged_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`waiter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `waiter_tables` (
	`id` text PRIMARY KEY NOT NULL,
	`waiter_id` text NOT NULL,
	`table_id` text NOT NULL,
	`assigned_at` integer NOT NULL,
	`unassigned_at` integer,
	FOREIGN KEY (`waiter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE cascade
);
