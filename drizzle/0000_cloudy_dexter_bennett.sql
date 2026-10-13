CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`semester` integer NOT NULL,
	`subject` text NOT NULL,
	`title` text NOT NULL,
	`unit` text DEFAULT '' NOT NULL,
	`kind` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`file_key` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notes_semester` ON `notes` (`semester`);