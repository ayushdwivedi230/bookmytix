-- Add missing enum values to booking_status
ALTER TYPE "public"."booking_status" ADD VALUE IF NOT EXISTS 'pending';
--> statement-breakpoint
ALTER TYPE "public"."booking_status" ADD VALUE IF NOT EXISTS 'payment_pending';
--> statement-breakpoint
ALTER TYPE "public"."booking_status" ADD VALUE IF NOT EXISTS 'failed';
--> statement-breakpoint
ALTER TYPE "public"."booking_status" ADD VALUE IF NOT EXISTS 'refund_pending';
--> statement-breakpoint
ALTER TYPE "public"."booking_status" ADD VALUE IF NOT EXISTS 'refunded';
--> statement-breakpoint
ALTER TYPE "public"."booking_status" ADD VALUE IF NOT EXISTS 'expired';
--> statement-breakpoint

-- Alter bookings table
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_ref" varchar(60);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "ticket_subtotal" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "convenience_fee" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "tax_amount" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "food_total" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "coupon_id" integer;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "refund_amount" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_bookings_booking_ref" ON "bookings" ("booking_ref");
--> statement-breakpoint

-- Alter payments table
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider" varchar(50) DEFAULT 'razorpay' NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "order_id" varchar(100);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "signature" text;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refund_id" varchar(100);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refund_amount" numeric(10, 2);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "idempotency_key" varchar(150);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "webhook_processed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "metadata" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_order_id" ON "payments" ("order_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_payments_idempotency_key" ON "payments" ("idempotency_key");
--> statement-breakpoint

-- Alter tickets table
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ticket_ref" varchar(80);
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "is_used" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "used_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "qr_token" varchar(120);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tickets_ticket_ref" ON "tickets" ("ticket_ref");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tickets_qr_token" ON "tickets" ("qr_token");
--> statement-breakpoint

-- Alter coupons table
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "discount_type" varchar(20) DEFAULT 'percentage' NOT NULL;
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "usage_limit" integer DEFAULT 1000 NOT NULL;
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "used_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "per_user_limit" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '' NOT NULL;
