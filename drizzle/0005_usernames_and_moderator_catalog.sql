ALTER TYPE "public"."catalog_source" ADD VALUE 'moderator';--> statement-breakpoint
ALTER TABLE "fragrances" ADD COLUMN "added_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "fragrances" ADD CONSTRAINT "fragrances_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;