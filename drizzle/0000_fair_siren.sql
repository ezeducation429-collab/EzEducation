CREATE TABLE "note_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"buyer_hash" text NOT NULL,
	"amount" integer NOT NULL,
	"key_id" text NOT NULL,
	"payment_id" text,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"course" text DEFAULT 'bpharm' NOT NULL,
	"semester" integer NOT NULL,
	"subject" text NOT NULL,
	"title" text NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"file_key" text,
	"price_paise" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"encrypted_credentials" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"quiz_id" text NOT NULL,
	"user_id" text NOT NULL,
	"student" text NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"answers" text NOT NULL,
	"created_at" text NOT NULL,
	"quiz_title" text,
	"subject" text
);
--> statement-breakpoint
CREATE TABLE "quiz_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"quiz_id" text NOT NULL,
	"user_id" text NOT NULL,
	"student_name" text NOT NULL,
	"college_name" text,
	"student_semester" integer,
	"quiz_title" text NOT NULL,
	"subject" text NOT NULL,
	"snapshot" text NOT NULL,
	"duration" integer NOT NULL,
	"started_at" text NOT NULL,
	"submitted_at" text,
	"answers" text,
	"score" integer,
	"total" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"subject" text NOT NULL,
	"course" text DEFAULT 'bpharm' NOT NULL,
	"semester" integer DEFAULT 1 NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"duration" integer DEFAULT 10 NOT NULL,
	"published" integer DEFAULT 0 NOT NULL,
	"questions" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_note_orders_buyer_note" ON "note_orders" USING btree ("buyer_hash","note_id");--> statement-breakpoint
CREATE INDEX "idx_note_orders_buyer" ON "note_orders" USING btree ("buyer_hash");--> statement-breakpoint
CREATE INDEX "idx_note_orders_status" ON "note_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notes_semester" ON "notes" USING btree ("semester");--> statement-breakpoint
CREATE INDEX "idx_notes_course_semester" ON "notes" USING btree ("course","semester");--> statement-breakpoint
CREATE INDEX "idx_quiz_attempts_quiz" ON "quiz_attempts" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "idx_attempts_user" ON "quiz_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_attempts_quiz" ON "quiz_sessions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_started_at" ON "quiz_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_quizzes_course_sem_pub" ON "quizzes" USING btree ("course","semester","published");--> statement-breakpoint
CREATE INDEX "idx_quizzes_published" ON "quizzes" USING btree ("published");