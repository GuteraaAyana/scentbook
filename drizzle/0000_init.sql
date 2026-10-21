CREATE TYPE "public"."collection_status" AS ENUM('have', 'want', 'had');--> statement-breakpoint
CREATE TYPE "public"."concentration" AS ENUM('extrait', 'parfum', 'edp', 'edt', 'edc', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('feminine', 'masculine', 'unisex');--> statement-breakpoint
CREATE TYPE "public"."note_layer" AS ENUM('top', 'heart', 'base');--> statement-breakpoint
CREATE TYPE "public"."sentiment" AS ENUM('loved', 'fine', 'disliked');--> statement-breakpoint
CREATE TABLE "accords" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text NOT NULL,
	CONSTRAINT "accords_name_unique" UNIQUE("name"),
	CONSTRAINT "accords_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country" text,
	CONSTRAINT "brands_name_unique" UNIQUE("name"),
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"user_id" text NOT NULL,
	"fragrance_id" integer NOT NULL,
	"status" "collection_status" NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_items_user_id_fragrance_id_pk" PRIMARY KEY("user_id","fragrance_id")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id"),
	CONSTRAINT "no_self_follow" CHECK ("follows"."follower_id" <> "follows"."following_id")
);
--> statement-breakpoint
CREATE TABLE "fragrance_accords" (
	"fragrance_id" integer NOT NULL,
	"accord_id" integer NOT NULL,
	"strength" smallint NOT NULL,
	CONSTRAINT "fragrance_accords_fragrance_id_accord_id_pk" PRIMARY KEY("fragrance_id","accord_id"),
	CONSTRAINT "strength_range" CHECK ("fragrance_accords"."strength" BETWEEN 1 AND 100)
);
--> statement-breakpoint
CREATE TABLE "fragrance_notes" (
	"fragrance_id" integer NOT NULL,
	"note_id" integer NOT NULL,
	"layer" "note_layer" NOT NULL,
	CONSTRAINT "fragrance_notes_fragrance_id_note_id_layer_pk" PRIMARY KEY("fragrance_id","note_id","layer")
);
--> statement-breakpoint
CREATE TABLE "fragrance_perfumers" (
	"fragrance_id" integer NOT NULL,
	"perfumer_id" integer NOT NULL,
	CONSTRAINT "fragrance_perfumers_fragrance_id_perfumer_id_pk" PRIMARY KEY("fragrance_id","perfumer_id")
);
--> statement-breakpoint
CREATE TABLE "fragrances" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"release_year" smallint,
	"concentration" "concentration" NOT NULL,
	"gender" "gender" DEFAULT 'unisex' NOT NULL,
	"description" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fragrances_slug_unique" UNIQUE("slug"),
	CONSTRAINT "fragrances_brand_id_name_concentration_unique" UNIQUE("brand_id","name","concentration")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"family" text,
	CONSTRAINT "notes_name_unique" UNIQUE("name"),
	CONSTRAINT "notes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "perfumers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "perfumers_name_unique" UNIQUE("name"),
	CONSTRAINT "perfumers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rankings" (
	"user_id" text NOT NULL,
	"fragrance_id" integer NOT NULL,
	"sentiment" "sentiment" NOT NULL,
	"sort_key" double precision NOT NULL,
	"ranked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rankings_user_id_fragrance_id_pk" PRIMARY KEY("user_id","fragrance_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fragrance_id" integer NOT NULL,
	"body" text NOT NULL,
	"longevity" smallint,
	"sillage" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_user_id_fragrance_id_unique" UNIQUE("user_id","fragrance_id"),
	CONSTRAINT "longevity_range" CHECK ("reviews"."longevity" BETWEEN 1 AND 5),
	CONSTRAINT "sillage_range" CHECK ("reviews"."sillage" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"username" text,
	"bio" text,
	"city" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "wears" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fragrance_id" integer NOT NULL,
	"worn_on" date NOT NULL,
	"occasion" text,
	"temperature_c" smallint,
	"weather" text,
	"compliments" smallint DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compliments_nonnegative" CHECK ("wears"."compliments" >= 0)
);
--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_fragrance_id_fragrances_id_fk" FOREIGN KEY ("fragrance_id") REFERENCES "public"."fragrances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fragrance_accords" ADD CONSTRAINT "fragrance_accords_fragrance_id_fragrances_id_fk" FOREIGN KEY ("fragrance_id") REFERENCES "public"."fragrances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fragrance_accords" ADD CONSTRAINT "fragrance_accords_accord_id_accords_id_fk" FOREIGN KEY ("accord_id") REFERENCES "public"."accords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fragrance_notes" ADD CONSTRAINT "fragrance_notes_fragrance_id_fragrances_id_fk" FOREIGN KEY ("fragrance_id") REFERENCES "public"."fragrances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fragrance_notes" ADD CONSTRAINT "fragrance_notes_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fragrance_perfumers" ADD CONSTRAINT "fragrance_perfumers_fragrance_id_fragrances_id_fk" FOREIGN KEY ("fragrance_id") REFERENCES "public"."fragrances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fragrance_perfumers" ADD CONSTRAINT "fragrance_perfumers_perfumer_id_perfumers_id_fk" FOREIGN KEY ("perfumer_id") REFERENCES "public"."perfumers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fragrances" ADD CONSTRAINT "fragrances_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rankings" ADD CONSTRAINT "rankings_fragrance_id_fragrances_id_fk" FOREIGN KEY ("fragrance_id") REFERENCES "public"."fragrances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_fragrance_id_fragrances_id_fk" FOREIGN KEY ("fragrance_id") REFERENCES "public"."fragrances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wears" ADD CONSTRAINT "wears_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wears" ADD CONSTRAINT "wears_fragrance_id_fragrances_id_fk" FOREIGN KEY ("fragrance_id") REFERENCES "public"."fragrances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_items_fragrance_idx" ON "collection_items" USING btree ("fragrance_id","status");--> statement-breakpoint
CREATE INDEX "follows_following_idx" ON "follows" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "fragrance_accords_accord_idx" ON "fragrance_accords" USING btree ("accord_id");--> statement-breakpoint
CREATE INDEX "fragrance_notes_note_idx" ON "fragrance_notes" USING btree ("note_id","layer","fragrance_id");--> statement-breakpoint
CREATE INDEX "fragrance_perfumers_perfumer_idx" ON "fragrance_perfumers" USING btree ("perfumer_id");--> statement-breakpoint
CREATE INDEX "rankings_user_order_idx" ON "rankings" USING btree ("user_id","sentiment","sort_key");--> statement-breakpoint
CREATE INDEX "rankings_fragrance_idx" ON "rankings" USING btree ("fragrance_id","sentiment");--> statement-breakpoint
CREATE INDEX "reviews_fragrance_idx" ON "reviews" USING btree ("fragrance_id");--> statement-breakpoint
CREATE INDEX "wears_user_date_idx" ON "wears" USING btree ("user_id","worn_on");--> statement-breakpoint
CREATE INDEX "wears_fragrance_date_idx" ON "wears" USING btree ("fragrance_id","worn_on");