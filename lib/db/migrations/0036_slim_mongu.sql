ALTER TABLE "ArContact" DROP CONSTRAINT "ArContact_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "ArInvoice" DROP CONSTRAINT "ArInvoice_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "ArJobRun" DROP CONSTRAINT "ArJobRun_userId_User_id_fk";
--> statement-breakpoint
ALTER TABLE "ArContact" ALTER COLUMN "userId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ArInvoice" ALTER COLUMN "userId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ArJobRun" ALTER COLUMN "userId" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "ArContact" ADD CONSTRAINT "ArContact_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArInvoice" ADD CONSTRAINT "ArInvoice_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ArJobRun" ADD CONSTRAINT "ArJobRun_userId_User_clerkId_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("clerkId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ar_customer_history_user_id_customer_id_unique" ON "ArCustomerHistory" USING btree ("userId","customerId");