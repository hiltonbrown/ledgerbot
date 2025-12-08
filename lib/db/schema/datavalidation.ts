import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { VerificationIssue } from "@/types/datavalidation";
import { user } from "../schema";

// Cached Xero contacts
export const dvContacts = pgTable(
  "dv_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id)
      .notNull(),
    xeroContactId: text("xero_contact_id").notNull(),
    xeroTenantId: text("xero_tenant_id").notNull(),
    name: text("name").notNull(),
    taxNumber: text("tax_number"), // ABN
    companyNumber: text("company_number"), // ACN
    isCustomer: boolean("is_customer").default(false),
    isSupplier: boolean("is_supplier").default(false),
    emailAddress: text("email_address"),
    phone: text("phone"),
    rawData: jsonb("raw_data"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userXeroContactIdx: index("dv_contacts_user_xero_idx").on(
      table.userId,
      table.xeroContactId
    ),
    taxNumberIdx: index("dv_contacts_tax_number_idx").on(table.taxNumber),
    companyNumberIdx: index("dv_contacts_company_number_idx").on(
      table.companyNumber
    ),
  })
);

// Verification results history
export const dvVerificationResults = pgTable("dv_verification_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .references(() => dvContacts.id)
    .notNull(),
  verificationStatus: text("verification_status").notNull(), // verified, warnings, errors, pending
  asicCompanyData: jsonb("asic_company_data"),
  asicBusinessNameData: jsonb("asic_business_name_data"),
  abrData: jsonb("abr_data"),
  issues: jsonb("issues").$type<VerificationIssue[]>().default([]),
  verifiedAt: timestamp("verified_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cached ASIC Companies dataset
export const dvAsicCompanies = pgTable(
  "dv_asic_companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    acn: text("acn").notNull(),
    abn: text("abn"),
    companyName: text("company_name").notNull(),
    type: text("type"),
    class: text("class"),
    subClass: text("sub_class"),
    status: text("status").notNull(),
    registrationDate: date("registration_date"),
    deregistrationDate: date("deregistration_date"),
    datasetDate: date("dataset_date").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    acnIdx: index("dv_asic_companies_acn_idx").on(table.acn),
    abnIdx: index("dv_asic_companies_abn_idx").on(table.abn),
    statusIdx: index("dv_asic_companies_status_idx").on(table.status),
  })
);

// Cached ASIC Business Names dataset
export const dvAsicBusinessNames = pgTable(
  "dv_asic_business_names",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    abn: text("abn").notNull(),
    businessName: text("business_name").notNull(),
    status: text("status").notNull(),
    registrationDate: date("registration_date"),
    cancellationDate: date("cancellation_date"),
    datasetDate: date("dataset_date").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    abnIdx: index("dv_asic_business_names_abn_idx").on(table.abn),
    statusIdx: index("dv_asic_business_names_status_idx").on(table.status),
  })
);

// Webhook event log
export const dvWebhookEvents = pgTable("dv_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => user.id),
  eventType: text("event_type").notNull(), // CONTACT_CREATE, CONTACT_UPDATE
  xeroContactId: text("xero_contact_id").notNull(),
  xeroTenantId: text("xero_tenant_id").notNull(),
  payload: jsonb("payload"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
