CREATE TABLE `note_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`buyer_hash` text NOT NULL,
	`amount` integer NOT NULL,
	`key_id` text NOT NULL,
	`payment_id` text,
	`status` text DEFAULT 'created' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_note_orders_buyer_note` ON `note_orders` (`buyer_hash`,`note_id`);--> statement-breakpoint
CREATE TABLE `payment_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`encrypted_credentials` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `notes` ADD `price_paise` integer DEFAULT 0 NOT NULL;