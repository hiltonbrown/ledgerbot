CREATE TABLE "ArOverpayment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"contactId" uuid NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"amountAllocated" numeric(10, 2) DEFAULT '0' NOT NULL,
	"amountRemaining" numeric(10, 2) DEFAULT '0' NOT NULL,
	"date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'authorised' NOT NULL,
	"externalRef" varchar(255) NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ArPrepayment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"contactId" uuid NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"amountAllocated" numeric(10, 2) DEFAULT '0' NOT NULL,
	"amountRemaining" numeric(10, 2) DEFAULT '0' NOT NULL,
	"date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'authorised' NOT NULL,
	"externalRef" varchar(255) NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ArOverpayment" ADD CONSTRAINT "ArOverpayment_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ArOverpayment" ADD CONSTRAINT "ArOverpayment_contactId_ArContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ArContact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArPrepayment" ADD CONSTRAINT "ArPrepayment_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ArPrepayment" ADD CONSTRAINT "ArPrepayment_contactId_ArContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ArContact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ar_overpayment_user_id_idx" ON "ArOverpayment" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ar_overpayment_contact_id_idx" ON "ArOverpayment" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "ar_overpayment_external_ref_idx" ON "ArOverpayment" USING btree ("externalRef");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_overpayment_external_ref_user_id_unique" ON "ArOverpayment" USING btree ("externalRef","userId");--> statement-breakpoint
CREATE INDEX "ar_prepayment_user_id_idx" ON "ArPrepayment" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ar_prepayment_contact_id_idx" ON "ArPrepayment" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "ar_prepayment_external_ref_idx" ON "ArPrepayment" USING btree ("externalRef");--> statement-breakpoint
CREATE UNIQUE INDEX "ar_prepayment_external_ref_user_id_unique" ON "ArPrepayment" USING btree ("externalRef","userId");