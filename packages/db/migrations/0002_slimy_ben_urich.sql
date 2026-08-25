ALTER TABLE `invites` ADD `project_id` text REFERENCES projects(id);--> statement-breakpoint
ALTER TABLE `invites` ADD `role` text;