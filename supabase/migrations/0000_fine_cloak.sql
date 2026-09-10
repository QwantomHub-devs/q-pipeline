CREATE TYPE "public"."fellow_stage" AS ENUM('applicant', 'training', 'assessing', 'fellow', 'placed', 'alumni');--> statement-breakpoint
CREATE TYPE "public"."fellow_tier" AS ENUM('none', 'top_tier', 'standard', 'not_selected');--> statement-breakpoint
CREATE TABLE "fellow_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"phone_number" varchar(50),
	"country" varchar(10) DEFAULT 'NG' NOT NULL,
	"stage" "fellow_stage" DEFAULT 'applicant' NOT NULL,
	"tier" "fellow_tier" DEFAULT 'none' NOT NULL,
	"bio" text,
	"github_handle" varchar(255),
	"linkedin_url" varchar(255),
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fellow_profiles_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "fellow_profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "idx_fellow_profiles_clerk_user_id" ON "fellow_profiles" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "idx_fellow_profiles_email" ON "fellow_profiles" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_fellow_profiles_stage_tier" ON "fellow_profiles" USING btree ("stage","tier");