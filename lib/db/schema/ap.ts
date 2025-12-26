import type { InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "../schema";

/**
 * Accounts Payable (AP) Database Schema
 *
 * Manages supplier bills, payments, bank account changes, and risk assessments
 * for the Accounts Payable agent workspace.
 */

/**
 * AP Supplier/Contact records
 * Stores supplier information for bill management
 */
export const apContact = pgTable(
  "ApContact",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tenantId: varchar("tenantId", { length: 255 }).notNull().default("legacy"),
    name: varchar("name", { length: 255 }).notNull(),
    abn: varchar("abn", { length: 11 }), // Australian Business Number
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, pending, blocked
    riskLevel: varchar("riskLevel", { length: 20 }).notNull().default("low"), // low, medium, high, critical
    paymentTerms: varchar("paymentTerms", { length: 50 }), // e.g., "Net 30"
    defaultAccount: varchar("defaultAccount", { length: 50 }), // Default expense account code
    externalRef: varchar("externalRef", { length: 255 }), // Xero contact ID
    xeroUpdatedDateUtc: timestamp("xeroUpdatedDateUtc"),
    xeroModifiedDateUtc: timestamp("xeroModifiedDateUtc"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ap_contact_user_id_idx").on(table.userId),
    tenantIdIdx: index("ap_contact_tenant_id_idx").on(table.tenantId),
    externalRefIdx: index("ap_contact_external_ref_idx").on(table.externalRef),
    statusIdx: index("ap_contact_status_idx").on(table.status),
    riskLevelIdx: index("ap_contact_risk_level_idx").on(table.riskLevel),
    // Composite index for efficient lookups by tenant and external ref
    tenantExternalRefUnq: uniqueIndex(
      "ap_contact_tenant_external_ref_unique"
    ).on(table.tenantId, table.externalRef),
  })
);

export type ApContact = InferSelectModel<typeof apContact>;
export type ApContactInsert = typeof apContact.$inferInsert;

/**
 * AP Bills (supplier invoices)
 * Stores bills with payment tracking and status management
 */
export const apBill = pgTable(
  "ApBill",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tenantId: varchar("tenantId", { length: 255 }).notNull().default("legacy"),
    contactId: uuid("contactId")
      .notNull()
      .references(() => apContact.id),
    number: varchar("number", { length: 50 }).notNull(),
    reference: varchar("reference", { length: 100 }), // PO number or other reference
    issueDate: timestamp("issueDate").notNull(),
    dueDate: timestamp("dueDate").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("AUD"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: numeric("tax", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    amountPaid: numeric("amountPaid", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, awaiting_approval, approved, disputed, paid, overdue, cancelled
    approvalStatus: varchar("approvalStatus", { length: 20 })
      .notNull()
      .default("pending"), // pending, approved, rejected, escalated, expired
    approvedBy: varchar("approvedBy", { length: 255 }), // User ID who approved
    approvedAt: timestamp("approvedAt"),
    hasAttachment: boolean("hasAttachment").default(false),
    attachmentUrl: text("attachmentUrl"),
    externalRef: varchar("externalRef", { length: 255 }), // Xero invoice ID
    xeroUpdatedDateUtc: timestamp("xeroUpdatedDateUtc"),
    xeroModifiedDateUtc: timestamp("xeroModifiedDateUtc"),
    lineItems:
      jsonb("lineItems").$type<
        Array<{
          description: string;
          accountCode?: string;
          accountName?: string;
          quantity: number;
          unitAmount: number;
          lineAmount: number;
          taxType?: string;
          taxAmount?: number;
        }>
      >(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ap_bill_user_id_idx").on(table.userId),
    tenantIdIdx: index("ap_bill_tenant_id_idx").on(table.tenantId),
    contactIdIdx: index("ap_bill_contact_id_idx").on(table.contactId),
    statusIdx: index("ap_bill_status_idx").on(table.status),
    dueDateIdx: index("ap_bill_due_date_idx").on(table.dueDate),
    externalRefIdx: index("ap_bill_external_ref_idx").on(table.externalRef),
    // Composite index for efficient lookups by tenant and external ref
    tenantExternalRefUnq: uniqueIndex("ap_bill_tenant_external_ref_unique").on(
      table.tenantId,
      table.externalRef
    ),
  })
);

export type ApBill = InferSelectModel<typeof apBill>;
export type ApBillInsert = typeof apBill.$inferInsert;

/**
 * AP Payments
 * Tracks payments made to suppliers against bills
 */
export const apPayment = pgTable(
  "ApPayment",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    tenantId: varchar("tenantId", { length: 255 }).notNull().default("legacy"),
    billId: uuid("billId")
      .notNull()
      .references(() => apBill.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    paidAt: timestamp("paidAt").notNull(),
    method: varchar("method", { length: 50 }), // eft, cheque, credit_card, etc.
    reference: varchar("reference", { length: 255 }), // Payment reference or transaction ID
    bankAccount: varchar("bankAccount", { length: 100 }), // Bank account used for payment
    externalRef: varchar("externalRef", { length: 255 }), // Xero payment ID
    xeroUpdatedDateUtc: timestamp("xeroUpdatedDateUtc"),
    xeroModifiedDateUtc: timestamp("xeroModifiedDateUtc"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index("ap_payment_tenant_id_idx").on(table.tenantId),
    billIdIdx: index("ap_payment_bill_id_idx").on(table.billId),
    paidAtIdx: index("ap_payment_paid_at_idx").on(table.paidAt),
    externalRefIdx: index("ap_payment_external_ref_idx").on(table.externalRef),
  })
);

export type ApPayment = InferSelectModel<typeof apPayment>;
export type ApPaymentInsert = typeof apPayment.$inferInsert;

/**
 * AP Supplier Bank Account Changes
 * Tracks changes to supplier bank details for fraud detection
 */
export const apBankChange = pgTable(
  "ApBankChange",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contactId: uuid("contactId")
      .notNull()
      .references(() => apContact.id, { onDelete: "cascade" }),
    // Old bank details
    oldAccountName: varchar("oldAccountName", { length: 255 }),
    oldBsb: varchar("oldBsb", { length: 7 }),
    oldAccountNumber: varchar("oldAccountNumber", { length: 50 }),
    // New bank details
    newAccountName: varchar("newAccountName", { length: 255 }),
    newBsb: varchar("newBsb", { length: 7 }),
    newAccountNumber: varchar("newAccountNumber", { length: 50 }),
    // Change tracking
    detectedAt: timestamp("detectedAt").notNull().defaultNow(),
    verifiedAt: timestamp("verifiedAt"),
    verifiedBy: varchar("verifiedBy", { length: 255 }), // User ID who verified
    isVerified: boolean("isVerified").default(false),
    verificationMethod: varchar("verificationMethod", { length: 50 }), // email, phone, written_confirmation
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ap_bank_change_user_id_idx").on(table.userId),
    contactIdIdx: index("ap_bank_change_contact_id_idx").on(table.contactId),
    detectedAtIdx: index("ap_bank_change_detected_at_idx").on(table.detectedAt),
    isVerifiedIdx: index("ap_bank_change_is_verified_idx").on(table.isVerified),
  })
);

export type ApBankChange = InferSelectModel<typeof apBankChange>;
export type ApBankChangeInsert = typeof apBankChange.$inferInsert;

/**
 * AP Risk Assessments
 * Stores risk analysis results for bills and payments
 */
export const apRiskAssessment = pgTable(
  "ApRiskAssessment",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    billId: uuid("billId")
      .notNull()
      .references(() => apBill.id, { onDelete: "cascade" }),
    riskLevel: varchar("riskLevel", { length: 20 }).notNull().default("low"), // low, medium, high, critical
    riskScore: numeric("riskScore", { precision: 5, scale: 2 }).notNull(), // 0-100
    riskFlags: jsonb("riskFlags")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`), // missing_abn, duplicate_bill, etc.
    isDuplicate: boolean("isDuplicate").default(false),
    duplicateConfidence: numeric("duplicateConfidence", {
      precision: 3,
      scale: 2,
    }), // 0-1 confidence score
    potentialDuplicates: jsonb("potentialDuplicates").$type<
      Array<{
        billId: string;
        billNumber: string;
        amount: number;
        date: string;
        similarity: number;
      }>
    >(),
    recommendations: jsonb("recommendations").$type<string[]>(),
    aiCommentary: text("aiCommentary"), // Natural language explanation from agent
    assessedAt: timestamp("assessedAt").notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ap_risk_assessment_user_id_idx").on(table.userId),
    billIdIdx: index("ap_risk_assessment_bill_id_idx").on(table.billId),
    riskLevelIdx: index("ap_risk_assessment_risk_level_idx").on(
      table.riskLevel
    ),
    isDuplicateIdx: index("ap_risk_assessment_is_duplicate_idx").on(
      table.isDuplicate
    ),
  })
);

export type ApRiskAssessment = InferSelectModel<typeof apRiskAssessment>;
export type ApRiskAssessmentInsert = typeof apRiskAssessment.$inferInsert;

/**
 * AP Communication Artifacts
 * Stores generated email drafts and communication templates
 */
export const apCommsArtefact = pgTable(
  "ApCommsArtefact",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    billId: uuid("billId").references(() => apBill.id, { onDelete: "cascade" }),
    contactId: uuid("contactId")
      .notNull()
      .references(() => apContact.id, { onDelete: "cascade" }),
    purpose: varchar("purpose", { length: 50 }).notNull(), // follow_up, reminder, query, payment_advice
    channel: varchar("channel", { length: 20 }).notNull(), // email, sms
    subject: text("subject"), // For email
    body: text("body").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ap_comms_artefact_user_id_idx").on(table.userId),
    billIdIdx: index("ap_comms_artefact_bill_id_idx").on(table.billId),
    contactIdIdx: index("ap_comms_artefact_contact_id_idx").on(table.contactId),
    channelIdx: index("ap_comms_artefact_channel_idx").on(table.channel),
    createdAtIdx: index("ap_comms_artefact_created_at_idx").on(table.createdAt),
  })
);

export type ApCommsArtefact = InferSelectModel<typeof apCommsArtefact>;
export type ApCommsArtefactInsert = typeof apCommsArtefact.$inferInsert;

/**
 * AP Notes
 * User notes about suppliers, bills, or payment issues
 */
export const apNote = pgTable(
  "ApNote",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    billId: uuid("billId").references(() => apBill.id, { onDelete: "cascade" }),
    contactId: uuid("contactId").references(() => apContact.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull(),
    visibility: varchar("visibility", { length: 20 })
      .notNull()
      .default("private"), // private, shared
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    billIdIdx: index("ap_note_bill_id_idx").on(table.billId),
    contactIdIdx: index("ap_note_contact_id_idx").on(table.contactId),
    userIdIdx: index("ap_note_user_id_idx").on(table.userId),
  })
);

export type ApNote = InferSelectModel<typeof apNote>;
export type ApNoteInsert = typeof apNote.$inferInsert;

/**
 * AP Payment Schedules
 * Planned payment runs and cash flow projections
 */
export const apPaymentSchedule = pgTable(
  "ApPaymentSchedule",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    scheduledDate: timestamp("scheduledDate").notNull(),
    billIds: jsonb("billIds").$type<string[]>().notNull(),
    items: jsonb("items").$type<Array<{ billId: string; amount: number }>>(),
    totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }).notNull(),
    billCount: numeric("billCount", { precision: 5, scale: 0 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, ready, processing, completed, failed
    riskSummary: jsonb("riskSummary").$type<{
      critical: number;
      high: number;
      medium: number;
      low: number;
    }>(),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ap_payment_schedule_user_id_idx").on(table.userId),
    scheduledDateIdx: index("ap_payment_schedule_scheduled_date_idx").on(
      table.scheduledDate
    ),
    statusIdx: index("ap_payment_schedule_status_idx").on(table.status),
  })
);

export type ApPaymentSchedule = InferSelectModel<typeof apPaymentSchedule>;
export type ApPaymentScheduleInsert = typeof apPaymentSchedule.$inferInsert;

// Review Context Types
export type ReviewContextData = {
  prompt: string;
  metadata: {
    creditorId: string;
    creditorName: string;
    totalOutstanding: number;
    riskLevel: string;
    billCount: number;
  };
};

export const apReviewContext = pgTable(
  "ApReviewContext",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contactId: uuid("contactId")
      .notNull()
      .references(() => apContact.id, { onDelete: "cascade" }),
    contextData: jsonb("contextData").$type<ReviewContextData>().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userContactIdx: index("ap_review_context_user_contact_idx").on(
      table.userId,
      table.contactId
    ),
    expiresAtIdx: index("ap_review_context_expires_at_idx").on(table.expiresAt),
  })
);

export type ApReviewContext = InferSelectModel<typeof apReviewContext>;
export type ApReviewContextInsert = typeof apReviewContext.$inferInsert;
