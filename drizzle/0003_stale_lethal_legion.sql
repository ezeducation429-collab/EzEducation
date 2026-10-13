CREATE TABLE `quiz_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`user_id` text NOT NULL,
	`student_name` text NOT NULL,
	`quiz_title` text NOT NULL,
	`subject` text NOT NULL,
	`snapshot` text NOT NULL,
	`duration` integer NOT NULL,
	`started_at` text NOT NULL,
	`submitted_at` text,
	`answers` text,
	`score` integer,
	`total` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_attempts_user` ON `quiz_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_attempts_quiz` ON `quiz_sessions` (`quiz_id`);--> statement-breakpoint
ALTER TABLE `quiz_attempts` ADD `quiz_title` text;--> statement-breakpoint
ALTER TABLE `quiz_attempts` ADD `subject` text;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `course` text DEFAULT 'bpharm' NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `semester` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `unit` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `duration` integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `quizzes` ADD `updated_at` text DEFAULT '' NOT NULL;