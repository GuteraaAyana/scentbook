CREATE TYPE "public"."temperature_unit" AS ENUM('c', 'f');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city_place_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city_latitude" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city_longitude" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city_timezone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "temperature_unit" "temperature_unit" DEFAULT 'c' NOT NULL;--> statement-breakpoint
ALTER TABLE "wears" ADD COLUMN "place" text;--> statement-breakpoint
ALTER TABLE "wears" ADD COLUMN "place_latitude" double precision;--> statement-breakpoint
ALTER TABLE "wears" ADD COLUMN "place_longitude" double precision;