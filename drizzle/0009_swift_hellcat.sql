ALTER TABLE "todos" ADD COLUMN "priority" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "due_date" text;