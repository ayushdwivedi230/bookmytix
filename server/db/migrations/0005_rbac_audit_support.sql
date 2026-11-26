-- Add enum values to role
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'customer';
--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'cinema_manager';
--> statement-breakpoint

-- Alter users table for profile, verification, and RBAC
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(50);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_city" varchar(100) DEFAULT 'Delhi' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_genres" text DEFAULT '["Action", "Thriller"]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_languages" text DEFAULT '["Hindi", "English"]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_preferences" text DEFAULT '{"email":true,"sms":true,"promotional":false}' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_email_verified" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token" varchar(150);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_token" varchar(150);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_reset_expires_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cinema_id" integer;
--> statement-breakpoint

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer,
  "actor_email" varchar(255) NOT NULL,
  "actor_role" varchar(50) DEFAULT 'admin' NOT NULL,
  "action" varchar(100) NOT NULL,
  "resource_type" varchar(50) NOT NULL,
  "resource_id" varchar(100) NOT NULL,
  "details" text,
  "ip_address" varchar(50),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_resource" ON "audit_logs" ("resource_type", "resource_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at");
--> statement-breakpoint

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" serial PRIMARY KEY NOT NULL,
  "ticket_ref" varchar(50) NOT NULL UNIQUE,
  "user_id" integer NOT NULL,
  "booking_id" integer,
  "subject" text NOT NULL,
  "category" varchar(50) DEFAULT 'booking_issue' NOT NULL,
  "message" text NOT NULL,
  "status" varchar(30) DEFAULT 'open' NOT NULL,
  "priority" varchar(20) DEFAULT 'normal' NOT NULL,
  "admin_response" text,
  "resolved_by" integer,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "support_tickets_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL,
  CONSTRAINT "support_tickets_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_tickets_user_id" ON "support_tickets" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_tickets_booking_id" ON "support_tickets" ("booking_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_tickets_status" ON "support_tickets" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_support_tickets_ticket_ref" ON "support_tickets" ("ticket_ref");
