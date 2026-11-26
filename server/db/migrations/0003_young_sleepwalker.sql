CREATE TYPE "public"."operating_status" AS ENUM('active', 'maintenance', 'closed');--> statement-breakpoint
CREATE TYPE "public"."seat_category" AS ENUM('standard', 'premium', 'recliner');--> statement-breakpoint
CREATE TYPE "public"."show_status" AS ENUM('scheduled', 'selling', 'sold_out', 'cancelled');--> statement-breakpoint
CREATE TABLE "seat_locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"show_id" integer NOT NULL,
	"show_seat_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"lock_token" varchar(100) NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "uq_active_seat_lock" UNIQUE("show_id","show_seat_id")
);
--> statement-breakpoint
ALTER TABLE "screens" ADD COLUMN "seat_layout" text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "seats" ADD COLUMN "seat_category" "seat_category" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "seats" ADD COLUMN "price_multiplier" numeric(4, 2) DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "show_seats" ADD COLUMN "row" varchar(5) DEFAULT 'A' NOT NULL;--> statement-breakpoint
ALTER TABLE "show_seats" ADD COLUMN "category" "seat_category" DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "show_seats" ADD COLUMN "price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "language" varchar(50) DEFAULT 'Hindi' NOT NULL;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "format" varchar(50) DEFAULT '2D' NOT NULL;--> statement-breakpoint
ALTER TABLE "shows" ADD COLUMN "status" "show_status" DEFAULT 'selling' NOT NULL;--> statement-breakpoint
ALTER TABLE "theatres" ADD COLUMN "amenities" text DEFAULT '["4K Dolby Atmos", "Parking", "Food Court"]' NOT NULL;--> statement-breakpoint
ALTER TABLE "theatres" ADD COLUMN "phone" varchar(50) DEFAULT '+91 22 6600 0000' NOT NULL;--> statement-breakpoint
ALTER TABLE "theatres" ADD COLUMN "email" varchar(100) DEFAULT 'support@bookmytix.com' NOT NULL;--> statement-breakpoint
ALTER TABLE "theatres" ADD COLUMN "landmark" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "theatres" ADD COLUMN "operating_status" "operating_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "seat_locks" ADD CONSTRAINT "seat_locks_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_locks" ADD CONSTRAINT "seat_locks_show_seat_id_show_seats_id_fk" FOREIGN KEY ("show_seat_id") REFERENCES "public"."show_seats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seat_locks" ADD CONSTRAINT "seat_locks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_seat_locks_show_id" ON "seat_locks" USING btree ("show_id");--> statement-breakpoint
CREATE INDEX "idx_seat_locks_user_id" ON "seat_locks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_seat_locks_expires_at" ON "seat_locks" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_seat_locks_token" ON "seat_locks" USING btree ("lock_token");--> statement-breakpoint
CREATE INDEX "idx_show_seats_category" ON "show_seats" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_shows_screen_id" ON "shows" USING btree ("screen_id");--> statement-breakpoint
CREATE INDEX "idx_shows_status" ON "shows" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_theatres_operating_status" ON "theatres" USING btree ("operating_status");