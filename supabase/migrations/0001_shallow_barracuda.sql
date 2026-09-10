CREATE TYPE "public"."intake_status" AS ENUM('submitted', 'eligible', 'ineligible', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."nysc_status" AS ENUM('serving', 'completed', 'exempt', 'not_applicable');--> statement-breakpoint
CREATE TYPE "public"."outreach_channel" AS ENUM('nysc_camp', 'university', '3mtt', 'partner_org', 'social_media', 'direct', 'referral');--> statement-breakpoint
CREATE TABLE "applicant_intakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fellow_id" uuid NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"cohort_window" varchar(50) NOT NULL,
	"outreach_channel" "outreach_channel" DEFAULT 'direct' NOT NULL,
	"nysc_status" "nysc_status" DEFAULT 'not_applicable',
	"university" varchar(255),
	"years_of_experience" integer DEFAULT 0 NOT NULL,
	"primary_track" varchar(100) DEFAULT 'fullstack_ai' NOT NULL,
	"status" "intake_status" DEFAULT 'submitted' NOT NULL,
	"eligibility_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applicant_intakes" ADD CONSTRAINT "applicant_intakes_fellow_id_fellow_profiles_id_fk" FOREIGN KEY ("fellow_id") REFERENCES "public"."fellow_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_applicant_intakes_clerk_user_id" ON "applicant_intakes" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "idx_applicant_intakes_fellow_id" ON "applicant_intakes" USING btree ("fellow_id");--> statement-breakpoint
CREATE INDEX "idx_applicant_intakes_cohort_window" ON "applicant_intakes" USING btree ("clerk_user_id","cohort_window");