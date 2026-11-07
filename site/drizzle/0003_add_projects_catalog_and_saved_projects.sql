CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`ticker` text,
	`chain` text NOT NULL,
	`category` text NOT NULL,
	`segment` text NOT NULL,
	`status_label` text NOT NULL,
	`description` text NOT NULL,
	`difficulty` text NOT NULL,
	`reward_note` text,
	`contract_address` text,
	`explorer_url` text,
	`official_url` text,
	`x_handle` text,
	`verified_at` text NOT NULL,
	`verified_note` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_projects` (
	`project_id` integer PRIMARY KEY NOT NULL,
	`bookmarked` integer DEFAULT 1 NOT NULL,
	`task_status` text DEFAULT 'not_started' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
