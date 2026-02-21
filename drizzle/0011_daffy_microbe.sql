ALTER TABLE "todos" ADD COLUMN "recurrence_rule" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "recurrence_end_date" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "parent_todo_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding" json DEFAULT '{}'::json;