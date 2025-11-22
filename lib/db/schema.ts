import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../usage";

export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  clerkId: varchar("clerkId", { length: 255 }).unique(), // Nullable during migration
  clerkSynced: boolean("clerkSynced").default(false), // Track sync status
  createdAt: timestamp("createdAt").notNull().defaultNow(), // Add timestamp
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  confidence: real("confidence"), // Confidence score (0-1) for Q&A agent responses
  citations: jsonb("citations"), // Regulatory citations for Q&A agent responses
  needsReview: boolean("needsReview"), // Flag for low-confidence responses requiring human review
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    chatId: uuid("chatId").references(() => chat.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

export const contextFile = pgTable("ContextFile", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  originalName: varchar("originalName", { length: 255 }).notNull(),
  blobUrl: text("blobUrl").notNull(),
  fileType: varchar("fileType", { length: 128 }).notNull(),
  fileSize: integer("fileSize").notNull(),
  extractedText: text("extractedText"),
  tokenCount: integer("tokenCount"),
  status: varchar("status", { length: 32 }).notNull().default("processing"),
  errorMessage: text("errorMessage"),
  description: text("description"),
  tags: json("tags").$type<string[]>(),
  isPinned: boolean("isPinned").default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  lastUsedAt: timestamp("lastUsedAt"),
  processedAt: timestamp("processedAt"),
});

export type ContextFile = InferSelectModel<typeof contextFile>;

export const userSettings = pgTable("UserSettings", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  // firstName and lastName removed - now managed by Clerk
  country: varchar("country", { length: 10 }),
  state: varchar("state", { length: 10 }),
  timezone: varchar("timezone", { length: 50 }).default("Australia/Sydney"),
  isLocked: boolean("isLocked").default(false),
  defaultModel: varchar("defaultModel", { length: 100 }),
  defaultReasoning: boolean("defaultReasoning").default(false),
  systemPrompt: text("systemPrompt"), // Legacy: kept for migration, not used
  codePrompt: text("codePrompt"), // Legacy: kept for migration, not used
  sheetPrompt: text("sheetPrompt"), // Legacy: kept for migration, not used
  // Custom instructions (combined with locked base prompts)
  customSystemInstructions: text("customSystemInstructions"),
  customCodeInstructions: text("customCodeInstructions"),
  customSheetInstructions: text("customSheetInstructions"),
  // Template variables for system prompt
  companyName: varchar("companyName", { length: 255 }),
  industryContext: text("industryContext"),
  chartOfAccounts: text("chartOfAccounts"),
  toneAndGrammar: text("toneAndGrammar"),
  customVariables: jsonb("customVariables").$type<Record<string, string>>(),
  suggestions:
    jsonb("suggestions").$type<
      Array<{
        id: string;
        text: string;
        enabled: boolean;
        order: number;
      }>
    >(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type UserSettings = InferSelectModel<typeof userSettings>;

export const xeroConnection = pgTable("XeroConnection", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  xeroConnectionId: varchar("xeroConnectionId", { length: 255 }), // Xero's connection ID from /connections endpoint
  tenantId: varchar("tenantId", { length: 255 }).notNull(),
  tenantName: varchar("tenantName", { length: 255 }),
  tenantType: varchar("tenantType", { length: 50 }), // ORGANISATION, PRACTICEMANAGER, PRACTICE
  // Organisation metadata from GET /organisation endpoint (Xero best practice)
  organisationId: varchar("organisationId", { length: 255 }), // Xero's organisation UUID
  shortCode: varchar("shortCode", { length: 10 }), // For deep linking (e.g., !TJ7Tb)
  baseCurrency: varchar("baseCurrency", { length: 3 }), // ISO 4217 currency code (e.g., GBP, AUD, NZD)
  organisationType: varchar("organisationType", { length: 50 }), // COMPANY, ACCOUNTING_PRACTICE
  isDemoCompany: boolean("isDemoCompany").default(false), // True if demo organisation (data resets regularly)
  accessToken: text("accessToken").notNull(), // Encrypted
  refreshToken: text("refreshToken").notNull(), // Encrypted
  refreshTokenIssuedAt: timestamp("refreshTokenIssuedAt").notNull(), // When refresh token was first issued (for 60-day expiry tracking)
  expiresAt: timestamp("expiresAt").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull(),
  authenticationEventId: varchar("authenticationEventId", { length: 255 }), // Xero auth event ID for connection tracking
  xeroCreatedDateUtc: timestamp("xeroCreatedDateUtc"), // When connection was first created in Xero
  xeroUpdatedDateUtc: timestamp("xeroUpdatedDateUtc"), // Last time user re-authorized in Xero
  isActive: boolean("isActive").notNull().default(true),
  connectionStatus: varchar("connectionStatus", { length: 50 }).default(
    "connected"
  ), // connected, disconnected, error
  lastError: text("lastError"), // User-friendly error message for display
  lastErrorDetails: text("lastErrorDetails"), // Technical error details for debugging (JSON string)
  lastErrorType: varchar("lastErrorType", { length: 50 }), // validation, authorization, token, rate_limit, server, network
  lastCorrelationId: varchar("lastCorrelationId", { length: 255 }), // X-Correlation-Id from Xero for support tickets
  lastApiCallAt: timestamp("lastApiCallAt"), // Track last successful API call for cleanup
  rateLimitMinuteRemaining: integer("rateLimitMinuteRemaining"), // X-MinLimit-Remaining header value
  rateLimitDayRemaining: integer("rateLimitDayRemaining"), // X-DayLimit-Remaining header value
  rateLimitResetAt: timestamp("rateLimitResetAt"), // When rate limit will reset (from Retry-After)
  rateLimitProblem: varchar("rateLimitProblem", { length: 50 }), // X-Rate-Limit-Problem header (minute or day)
  // Chart of Accounts
  chartOfAccounts: jsonb("chartOfAccounts").$type<XeroAccount[]>(), // Structured chart of accounts data from Xero API
  chartOfAccountsSyncedAt: timestamp("chartOfAccountsSyncedAt"), // Last time chart was synced from Xero
  chartOfAccountsVersion: varchar("chartOfAccountsVersion", { length: 50 }), // Xero API version used for sync
  chartOfAccountsHash: varchar("chartOfAccountsHash", { length: 64 }), // SHA-256 hash for change detection
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type XeroConnection = InferSelectModel<typeof xeroConnection>;

// Xero Account structure from Xero API (camelCase as returned by xero-node SDK)
export type XeroAccount = {
  accountID: string;
  code: string;
  name: string;
  type: string; // BANK, CURRENT, CURRLIAB, DEPRECIATN, DIRECTCOSTS, EQUITY, EXPENSE, FIXED, INVENTORY, LIABILITY, NONCURRENT, OTHERINCOME, OVERHEADS, PREPAYMENT, REVENUE, SALES, TERMLIAB, PAYGLIABILITY
  taxType?: string;
  description?: string;
  _class?: string; // ASSET, EQUITY, EXPENSE, LIABILITY, REVENUE (note: underscore prefix)
  status: string; // ACTIVE, ARCHIVED, DELETED
  systemAccount?: string;
  enablePaymentsToAccount?: boolean;
  showInExpenseClaims?: boolean;
  bankAccountNumber?: string;
  bankAccountType?: string;
  currencyCode?: string;
  reportingCode?: string;
  reportingCodeName?: string;
  hasAttachments?: boolean;
  updatedDateUTC?: string;
  addToWatchlist?: boolean;
};

export const regulatoryDocument = pgTable(
  "RegulatoryDocument",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    country: varchar("country", { length: 2 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    title: text("title").notNull(),
    sourceUrl: text("sourceUrl").notNull().unique(),
    content: text("content"),
    extractedText: text("extractedText"),
    tokenCount: integer("tokenCount").default(0),
    effectiveDate: timestamp("effectiveDate"),
    expiryDate: timestamp("expiryDate"),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    scrapedAt: timestamp("scrapedAt").notNull(),
    lastCheckedAt: timestamp("lastCheckedAt").notNull(),
    searchVector: text("search_vector"), // tsvector managed by database trigger
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    countryIdx: index("regulatory_document_country_idx").on(table.country),
    categoryIdx: index("regulatory_document_category_idx").on(table.category),
    statusIdx: index("regulatory_document_status_idx").on(table.status),
    sourceUrlIdx: index("regulatory_document_source_url_idx").on(
      table.sourceUrl
    ),
  })
);

export type RegulatoryDocument = InferSelectModel<typeof regulatoryDocument>;
export type RegulatoryDocumentInsert = typeof regulatoryDocument.$inferInsert;

export const regulatoryScrapeJob = pgTable(
  "RegulatoryScrapeJob",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    sourceUrl: text("sourceUrl"),
    country: varchar("country", { length: 2 }),
    category: varchar("category", { length: 50 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    documentsScraped: integer("documentsScraped").default(0),
    documentsUpdated: integer("documentsUpdated").default(0),
    documentsArchived: integer("documentsArchived").default(0),
    errorMessage: text("errorMessage"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("regulatory_scrape_job_status_idx").on(table.status),
    countryIdx: index("regulatory_scrape_job_country_idx").on(table.country),
    createdAtIdx: index("regulatory_scrape_job_created_at_idx").on(
      table.createdAt
    ),
  })
);

export type RegulatoryScrapeJob = InferSelectModel<typeof regulatoryScrapeJob>;
export type RegulatoryScrapeJobInsert = typeof regulatoryScrapeJob.$inferInsert;

export const qaReviewRequest = pgTable(
  "QaReviewRequest",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    messageId: text("messageId").notNull(),
    query: text("query").notNull(),
    response: text("response").notNull(),
    confidence: real("confidence").notNull(),
    citations: jsonb("citations"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    assignedTo: uuid("assignedTo").references(() => user.id),
    resolutionNotes: text("resolutionNotes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    resolvedAt: timestamp("resolvedAt"),
  },
  (table) => ({
    userIdIdx: index("qa_review_request_user_id_idx").on(table.userId),
    statusIdx: index("qa_review_request_status_idx").on(table.status),
  })
);

export type QaReviewRequest = InferSelectModel<typeof qaReviewRequest>;
export type QaReviewRequestInsert = typeof qaReviewRequest.$inferInsert;

export const agentTrace = pgTable(
  "AgentTrace",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId").notNull(),
    toolName: text("toolName"),
    toolArgs: jsonb("toolArgs"),
    toolResult: jsonb("toolResult"),
    durationMs: integer("durationMs"),
    status: varchar("status", { length: 20 }).notNull(), // 'success', 'error'
    errorDetails: text("errorDetails"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    chatIdIdx: index("agent_trace_chat_id_idx").on(table.chatId),
    messageIdIdx: index("agent_trace_message_id_idx").on(table.messageId),
    toolNameIdx: index("agent_trace_tool_name_idx").on(table.toolName),
    statusIdx: index("agent_trace_status_idx").on(table.status),
    createdAtIdx: index("agent_trace_created_at_idx").on(table.createdAt),
  })
);

export type AgentTrace = InferSelectModel<typeof agentTrace>;
export type AgentTraceInsert = typeof agentTrace.$inferInsert;

export * from "./schema/ap";
export * from "./schema/ar";
