CREATE TABLE "ApBankChange" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"contactId" uuid NOT NULL,
	"oldAccountName" varchar(255),
	"oldBsb" varchar(7),
	"oldAccountNumber" varchar(50),
	"newAccountName" varchar(255),
	"newBsb" varchar(7),
	"newAccountNumber" varchar(50),
	"detectedAt" timestamp DEFAULT now() NOT NULL,
	"verifiedAt" timestamp,
	"verifiedBy" varchar(255),
	"isVerified" boolean DEFAULT false,
	"verificationMethod" varchar(50),
	"notes" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ApBill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"contactId" uuid NOT NULL,
	"number" varchar(50) NOT NULL,
	"reference" varchar(100),
	"issueDate" timestamp NOT NULL,
	"dueDate" timestamp NOT NULL,
	"currency" varchar(3) DEFAULT 'AUD' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"amountPaid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"approvalStatus" varchar(20) DEFAULT 'pending' NOT NULL,
	"approvedBy" varchar(255),
	"approvedAt" timestamp,
	"hasAttachment" boolean DEFAULT false,
	"attachmentUrl" text,
	"externalRef" varchar(255),
	"lineItems" jsonb,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ApCommsArtefact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"billId" uuid,
	"contactId" uuid NOT NULL,
	"purpose" varchar(50) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ApContact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"abn" varchar(11),
	"email" varchar(255),
	"phone" varchar(50),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"riskLevel" varchar(20) DEFAULT 'low' NOT NULL,
	"paymentTerms" varchar(50),
	"defaultAccount" varchar(50),
	"externalRef" varchar(255),
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ApNote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"billId" uuid,
	"contactId" uuid,
	"body" text NOT NULL,
	"visibility" varchar(20) DEFAULT 'private' NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ApPayment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billId" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"paidAt" timestamp NOT NULL,
	"method" varchar(50),
	"reference" varchar(255),
	"bankAccount" varchar(100),
	"externalRef" varchar(255),
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ApPaymentSchedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"scheduledDate" timestamp NOT NULL,
	"billIds" jsonb NOT NULL,
	"totalAmount" numeric(10, 2) NOT NULL,
	"billCount" numeric(5, 0) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"riskSummary" jsonb,
	"notes" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ApRiskAssessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"billId" uuid NOT NULL,
	"riskLevel" varchar(20) DEFAULT 'low' NOT NULL,
	"riskScore" numeric(5, 2) NOT NULL,
	"riskFlags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isDuplicate" boolean DEFAULT false,
	"duplicateConfidence" numeric(3, 2),
	"potentialDuplicates" jsonb,
	"recommendations" jsonb,
	"aiCommentary" text,
	"assessedAt" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ApBankChange" ADD CONSTRAINT "ApBankChange_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApBankChange" ADD CONSTRAINT "ApBankChange_contactId_ApContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ApContact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApBill" ADD CONSTRAINT "ApBill_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApBill" ADD CONSTRAINT "ApBill_contactId_ApContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ApContact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApCommsArtefact" ADD CONSTRAINT "ApCommsArtefact_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApCommsArtefact" ADD CONSTRAINT "ApCommsArtefact_billId_ApBill_id_fk" FOREIGN KEY ("billId") REFERENCES "public"."ApBill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApCommsArtefact" ADD CONSTRAINT "ApCommsArtefact_contactId_ApContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ApContact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApContact" ADD CONSTRAINT "ApContact_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApNote" ADD CONSTRAINT "ApNote_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApNote" ADD CONSTRAINT "ApNote_billId_ApBill_id_fk" FOREIGN KEY ("billId") REFERENCES "public"."ApBill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApNote" ADD CONSTRAINT "ApNote_contactId_ApContact_id_fk" FOREIGN KEY ("contactId") REFERENCES "public"."ApContact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApPayment" ADD CONSTRAINT "ApPayment_billId_ApBill_id_fk" FOREIGN KEY ("billId") REFERENCES "public"."ApBill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApPaymentSchedule" ADD CONSTRAINT "ApPaymentSchedule_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApRiskAssessment" ADD CONSTRAINT "ApRiskAssessment_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApRiskAssessment" ADD CONSTRAINT "ApRiskAssessment_billId_ApBill_id_fk" FOREIGN KEY ("billId") REFERENCES "public"."ApBill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ap_bank_change_user_id_idx" ON "ApBankChange" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ap_bank_change_contact_id_idx" ON "ApBankChange" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "ap_bank_change_detected_at_idx" ON "ApBankChange" USING btree ("detectedAt");--> statement-breakpoint
CREATE INDEX "ap_bank_change_is_verified_idx" ON "ApBankChange" USING btree ("isVerified");--> statement-breakpoint
CREATE INDEX "ap_bill_user_id_idx" ON "ApBill" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ap_bill_contact_id_idx" ON "ApBill" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "ap_bill_status_idx" ON "ApBill" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ap_bill_due_date_idx" ON "ApBill" USING btree ("dueDate");--> statement-breakpoint
CREATE INDEX "ap_bill_external_ref_idx" ON "ApBill" USING btree ("externalRef");--> statement-breakpoint
CREATE UNIQUE INDEX "ap_bill_external_ref_user_id_unique" ON "ApBill" USING btree ("externalRef","userId");--> statement-breakpoint
CREATE INDEX "ap_comms_artefact_user_id_idx" ON "ApCommsArtefact" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ap_comms_artefact_bill_id_idx" ON "ApCommsArtefact" USING btree ("billId");--> statement-breakpoint
CREATE INDEX "ap_comms_artefact_contact_id_idx" ON "ApCommsArtefact" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "ap_comms_artefact_channel_idx" ON "ApCommsArtefact" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "ap_comms_artefact_created_at_idx" ON "ApCommsArtefact" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "ap_contact_user_id_idx" ON "ApContact" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ap_contact_external_ref_idx" ON "ApContact" USING btree ("externalRef");--> statement-breakpoint
CREATE INDEX "ap_contact_status_idx" ON "ApContact" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ap_contact_risk_level_idx" ON "ApContact" USING btree ("riskLevel");--> statement-breakpoint
CREATE INDEX "ap_note_bill_id_idx" ON "ApNote" USING btree ("billId");--> statement-breakpoint
CREATE INDEX "ap_note_contact_id_idx" ON "ApNote" USING btree ("contactId");--> statement-breakpoint
CREATE INDEX "ap_note_user_id_idx" ON "ApNote" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ap_payment_bill_id_idx" ON "ApPayment" USING btree ("billId");--> statement-breakpoint
CREATE INDEX "ap_payment_paid_at_idx" ON "ApPayment" USING btree ("paidAt");--> statement-breakpoint
CREATE INDEX "ap_payment_external_ref_idx" ON "ApPayment" USING btree ("externalRef");--> statement-breakpoint
CREATE INDEX "ap_payment_schedule_user_id_idx" ON "ApPaymentSchedule" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ap_payment_schedule_scheduled_date_idx" ON "ApPaymentSchedule" USING btree ("scheduledDate");--> statement-breakpoint
CREATE INDEX "ap_payment_schedule_status_idx" ON "ApPaymentSchedule" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ap_risk_assessment_user_id_idx" ON "ApRiskAssessment" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ap_risk_assessment_bill_id_idx" ON "ApRiskAssessment" USING btree ("billId");--> statement-breakpoint
CREATE INDEX "ap_risk_assessment_risk_level_idx" ON "ApRiskAssessment" USING btree ("riskLevel");--> statement-breakpoint
CREATE INDEX "ap_risk_assessment_is_duplicate_idx" ON "ApRiskAssessment" USING btree ("isDuplicate");