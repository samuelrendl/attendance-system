ALTER TABLE "employee" ADD COLUMN "pin_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN "wrong_pin_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN "locked_until" timestamp with time zone;