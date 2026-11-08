CREATE TABLE `checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`domain` text NOT NULL,
	`verdict` text NOT NULL,
	`score` integer NOT NULL,
	`signals` text NOT NULL,
	`contracts` text NOT NULL,
	`page_title` text,
	`final_url` text,
	`http_status` integer,
	`registered_at` text,
	`registrar` text,
	`domain_age_days` integer,
	`created_at` integer NOT NULL,
	`owner_user_id` text
);
--> statement-breakpoint
CREATE INDEX `checks_owner_idx` ON `checks` (`owner_user_id`);--> statement-breakpoint
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
	`contract_address_canonical` text GENERATED ALWAYS AS (CASE
        WHEN "contract_address" IS NULL THEN NULL
        WHEN "chain" = 'Solana' THEN trim("contract_address")
        WHEN "chain" IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain') THEN
          CASE WHEN lower(substr(trim("contract_address"),1,2)) = '0x'
               THEN '0x' || lower(substr(trim("contract_address"),3))
               ELSE '0x' || lower(trim("contract_address")) END
        ELSE NULL
      END) STORED,
	`explorer_url` text,
	`official_url` text,
	`x_handle` text,
	`verified_at` text NOT NULL,
	`verified_note` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`provenance_source_url` text,
	`provenance_submitted_by` text,
	`provenance_verified_by` text,
	CONSTRAINT "projects_chain_allowlist_ck" CHECK("projects"."chain" IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain','Solana')),
	CONSTRAINT "projects_contract_format_ck" CHECK("projects"."contract_address" IS NULL
        OR ("projects"."chain" = 'Solana'
          AND length(trim("projects"."contract_address")) BETWEEN 32 AND 44
          AND trim("projects"."contract_address") NOT GLOB '*[^1-9A-HJ-NP-Za-km-z]*')
        OR ("projects"."chain" IN ('BNB Chain','Ethereum','Base','Arbitrum','Polygon','opBNB','Robinhood Chain')
          AND (
            (length(trim("projects"."contract_address")) = 42
             AND lower(substr(trim("projects"."contract_address"),1,2)) = '0x'
             AND substr(trim("projects"."contract_address"),3) NOT GLOB '*[^0-9a-fA-F]*')
            OR
            (length(trim("projects"."contract_address")) = 40
             AND trim("projects"."contract_address") NOT GLOB '*[^0-9a-fA-F]*')
          )))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_name_normalized_unique` ON `projects` (lower(trim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX `projects_contract_normalized_unique` ON `projects` (`chain`,`contract_address_canonical`) WHERE "projects"."contract_address" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`principal_id` text NOT NULL,
	`window` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`principal_id`, `window`, `window_start`)
);
--> statement-breakpoint
CREATE TABLE `saved_projects` (
	`principal_id` text NOT NULL,
	`project_id` integer NOT NULL,
	`bookmarked` integer DEFAULT 1 NOT NULL,
	`task_status` text DEFAULT 'not_started' NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`principal_id`, `project_id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scan_leases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`principal_id` text NOT NULL,
	`acquired_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scan_leases_expires_idx` ON `scan_leases` (`expires_at`);