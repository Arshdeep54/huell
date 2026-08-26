ALTER TABLE `projects` ADD `noindex` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `fail_on_broken_links` integer DEFAULT false NOT NULL;