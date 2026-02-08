CREATE INDEX "comments_todo_id_idx" ON "comments" USING btree ("todo_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_workspace_idx" ON "notifications" USING btree ("recipient_id","workspace_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_id","is_read");--> statement-breakpoint
CREATE INDEX "projects_workspace_id_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "timesheet_entries_workspace_id_idx" ON "timesheet_entries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "timesheet_entries_user_workspace_idx" ON "timesheet_entries" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "todos_workspace_id_idx" ON "todos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "todos_project_id_idx" ON "todos" USING btree ("project_id");