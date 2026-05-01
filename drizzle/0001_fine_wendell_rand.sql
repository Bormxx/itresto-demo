CREATE TABLE `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `client_loyalty` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`points` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `department_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`department_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expo_push_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE TABLE `loyalty_levels` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`min_points` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `loyalty_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `payment_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`provider` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promotion_items` (
	`id` text PRIMARY KEY NOT NULL,
	`promotion_id` text NOT NULL,
	`menu_item_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`restaurant_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`guest_name` text NOT NULL,
	`guest_phone` text,
	`table_id` text,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`guest_count` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE `shift_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`date` text NOT NULL,
	`shift_type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shift_staff_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`shift_id` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shift_table_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`shift_id` text NOT NULL,
	`table_id` text NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE TABLE `shift_template_staff_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shift_template_table_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`table_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shift_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`day_of_week` integer
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`achievement_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_department_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`department_id` text NOT NULL,
	`role_id` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `demo_counter` ADD `current_number` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `demo_counter` DROP COLUMN `last_number`;--> statement-breakpoint
ALTER TABLE `demo_rate_limits` ADD `count_today` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `demo_rate_limits` ADD `created_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `demo_rate_limits` DROP COLUMN `created_today`;--> statement-breakpoint
ALTER TABLE `demo_rate_limits` DROP COLUMN `today_date`;