CREATE TYPE "public"."movie_status" AS ENUM('now_showing', 'coming_soon', 'archived');--> statement-breakpoint
CREATE TABLE "movies" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"poster" text DEFAULT '' NOT NULL,
	"backdrop" text DEFAULT '' NOT NULL,
	"trailer_url" text DEFAULT '' NOT NULL,
	"genre" text DEFAULT 'Action' NOT NULL,
	"language" text DEFAULT 'Hindi' NOT NULL,
	"duration" text DEFAULT '2h 15m' NOT NULL,
	"release_date" timestamp with time zone DEFAULT now() NOT NULL,
	"certification" varchar(10) DEFAULT 'UA' NOT NULL,
	"cast" text DEFAULT '[]' NOT NULL,
	"crew" text DEFAULT '[]' NOT NULL,
	"rating" numeric(3, 1) DEFAULT '4.5' NOT NULL,
	"vote_count" integer DEFAULT 100 NOT NULL,
	"popularity" numeric(10, 2) DEFAULT '100.0' NOT NULL,
	"status" "movie_status" DEFAULT 'now_showing' NOT NULL,
	"formats" text DEFAULT '["2D"]' NOT NULL,
	"tmdb_id" integer,
	"imdb_id" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "event_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "movie_id" integer;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "movie_id" integer;--> statement-breakpoint
CREATE INDEX "idx_movies_slug" ON "movies" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_movies_status" ON "movies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_movies_genre" ON "movies" USING btree ("genre");--> statement-breakpoint
CREATE INDEX "idx_movies_language" ON "movies" USING btree ("language");--> statement-breakpoint
CREATE INDEX "idx_movies_rating" ON "movies" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_movies_release_date" ON "movies" USING btree ("release_date");--> statement-breakpoint
CREATE INDEX "idx_movies_popularity" ON "movies" USING btree ("popularity");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reviews_movie_id" ON "reviews" USING btree ("movie_id");--> statement-breakpoint
CREATE INDEX "idx_shows_movie_id" ON "shows" USING btree ("movie_id");