CREATE TYPE "public"."catalog_source" AS ENUM('curated', 'fragella');--> statement-breakpoint
ALTER TABLE "fragrances" ADD COLUMN "source" "catalog_source" DEFAULT 'curated' NOT NULL;--> statement-breakpoint
ALTER TABLE "fragrances" ADD COLUMN "external_id" text;