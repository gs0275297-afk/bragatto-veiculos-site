CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`last_login_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `vehicle_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`blur_data_url` text,
	`alt` text,
	`angle` text,
	`kind` text DEFAULT 'galeria' NOT NULL,
	`focal_x` real DEFAULT 50 NOT NULL,
	`focal_y` real DEFAULT 50 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `vehicle_photos_vehicle_idx` ON `vehicle_photos` (`vehicle_id`,`position`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`version` text,
	`body_type` text,
	`year_manufacture` integer,
	`year_model` integer NOT NULL,
	`mileage_km` integer,
	`transmission` text,
	`fuel` text,
	`color` text,
	`engine` text,
	`doors` integer,
	`price_cents` integer,
	`description` text,
	`features` text DEFAULT '[]' NOT NULL,
	`search_text` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'disponivel' NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`internal_notes` text,
	`model3d_enabled` integer DEFAULT false NOT NULL,
	`model3d_key` text,
	`model3d_url` text,
	`model3d_format` text,
	`model3d_kind` text,
	`model3d_source` text,
	`model3d_poster_key` text,
	`model3d_size_bytes` integer,
	`published_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_slug_idx` ON `vehicles` (`slug`);--> statement-breakpoint
CREATE INDEX `vehicles_listing_idx` ON `vehicles` (`published`,`status`);