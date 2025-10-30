import { pgTable, unique, uuid, varchar, boolean, timestamp, foreignKey, text, json, uniqueIndex, jsonb, numeric, integer, index, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const user = pgTable("User", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 64 }).notNull(),
	password: varchar({ length: 64 }),
	clerkId: varchar({ length: 255 }),
	clerkSynced: boolean().default(false),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("User_clerkId_unique").on(table.clerkId),
]);

export const suggestion = pgTable("Suggestion", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid().notNull(),
	documentCreatedAt: timestamp({ mode: 'string' }).notNull(),
	originalText: text().notNull(),
	suggestedText: text().notNull(),
	description: text(),
	isResolved: boolean().default(false).notNull(),
	userId: uuid().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Suggestion_userId_User_id_fk"
		}),
	foreignKey({
			columns: [table.documentId, table.documentCreatedAt],
			foreignColumns: [document.createdAt, document.id],
			name: "Suggestion_documentId_documentCreatedAt_Document_id_createdAt_f"
		}),
]);

export const message = pgTable("Message", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid().notNull(),
	role: varchar().notNull(),
	content: json().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Message_chatId_Chat_id_fk"
		}),
]);

export const xeroAccountCache = pgTable("XeroAccountCache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: varchar({ length: 255 }).notNull(),
	accountId: varchar({ length: 255 }).notNull(),
	data: jsonb().notNull(),
	cachedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastModifiedAt: timestamp({ mode: 'string' }).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	isStale: boolean().default(false).notNull(),
	code: varchar({ length: 50 }),
	name: varchar({ length: 500 }),
	type: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("xero_account_cache_unique").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.accountId.asc().nullsLast().op("text_ops")),
]);

export const xeroBankTransactionCache = pgTable("XeroBankTransactionCache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: varchar({ length: 255 }).notNull(),
	bankTransactionId: varchar({ length: 255 }).notNull(),
	data: jsonb().notNull(),
	cachedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastModifiedAt: timestamp({ mode: 'string' }).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	isStale: boolean().default(false).notNull(),
	bankAccountId: varchar({ length: 255 }),
	date: timestamp({ mode: 'string' }),
	status: varchar({ length: 50 }),
	total: numeric({ precision: 19, scale:  4 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("xero_bank_transaction_cache_unique").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.bankTransactionId.asc().nullsLast().op("text_ops")),
]);

export const messageV2 = pgTable("Message_v2", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid().notNull(),
	role: varchar().notNull(),
	parts: json().notNull(),
	attachments: json().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Message_v2_chatId_Chat_id_fk"
		}),
]);

export const stream = pgTable("Stream", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Stream_chatId_Chat_id_fk"
		}),
]);

export const chat = pgTable("Chat", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	userId: uuid().notNull(),
	title: text().notNull(),
	visibility: varchar().default('private').notNull(),
	lastContext: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Chat_userId_User_id_fk"
		}),
]);

export const xeroCacheSyncStatus = pgTable("XeroCacheSyncStatus", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: varchar({ length: 255 }).notNull(),
	entityType: varchar({ length: 50 }).notNull(),
	lastSyncAt: timestamp({ mode: 'string' }),
	lastSuccessAt: timestamp({ mode: 'string' }),
	lastFailureAt: timestamp({ mode: 'string' }),
	syncStatus: varchar({ length: 50 }).default('pending').notNull(),
	errorMessage: text(),
	recordCount: integer().default(0),
	apiCallsUsed: integer().default(0),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});

export const contextFile = pgTable("ContextFile", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid().notNull(),
	name: varchar({ length: 255 }).notNull(),
	originalName: varchar({ length: 255 }).notNull(),
	blobUrl: text().notNull(),
	fileType: varchar({ length: 128 }).notNull(),
	fileSize: integer().notNull(),
	extractedText: text(),
	tokenCount: integer(),
	status: varchar({ length: 32 }).default('processing').notNull(),
	errorMessage: text(),
	description: text(),
	tags: json(),
	isPinned: boolean().default(false),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastUsedAt: timestamp({ mode: 'string' }),
	processedAt: timestamp({ mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "ContextFile_userId_User_id_fk"
		}).onDelete("cascade"),
]);

export const xeroContactCache = pgTable("XeroContactCache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: varchar({ length: 255 }).notNull(),
	contactId: varchar({ length: 255 }).notNull(),
	data: jsonb().notNull(),
	cachedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastModifiedAt: timestamp({ mode: 'string' }).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	isStale: boolean().default(false).notNull(),
	name: varchar({ length: 500 }),
	emailAddress: varchar({ length: 500 }),
	contactStatus: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("xero_contact_cache_unique").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.contactId.asc().nullsLast().op("text_ops")),
]);

export const xeroInvoiceCache = pgTable("XeroInvoiceCache", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: varchar({ length: 255 }).notNull(),
	invoiceId: varchar({ length: 255 }).notNull(),
	invoiceNumber: varchar({ length: 255 }),
	data: jsonb().notNull(),
	cachedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	lastModifiedAt: timestamp({ mode: 'string' }).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	isStale: boolean().default(false).notNull(),
	status: varchar({ length: 50 }),
	contactId: varchar({ length: 255 }),
	date: timestamp({ mode: 'string' }),
	dueDate: timestamp({ mode: 'string' }),
	total: numeric({ precision: 19, scale:  4 }),
	amountDue: numeric({ precision: 19, scale:  4 }),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("xero_invoice_cache_unique").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.invoiceId.asc().nullsLast().op("text_ops")),
]);

export const chatXeroContext = pgTable("ChatXeroContext", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	chatId: uuid().notNull(),
	activeTenantIds: jsonb(),
	multiOrgEnabled: boolean().default(false),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("chat_xero_context_chat_unique").using("btree", table.chatId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "ChatXeroContext_chatId_Chat_id_fk"
		}).onDelete("cascade"),
]);

export const xeroWebhookEvent = pgTable("XeroWebhookEvent", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventId: varchar({ length: 255 }).notNull(),
	tenantId: varchar({ length: 255 }).notNull(),
	tenantType: varchar({ length: 50 }).notNull(),
	eventCategory: varchar({ length: 50 }).notNull(),
	eventType: varchar({ length: 50 }).notNull(),
	eventDateUtc: timestamp({ mode: 'string' }).notNull(),
	resourceId: varchar({ length: 255 }).notNull(),
	resourceUrl: text().notNull(),
	processed: boolean().default(false).notNull(),
	processedAt: timestamp({ mode: 'string' }),
	processingError: text(),
	payload: jsonb().notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	retryCount: integer().default(0).notNull(),
	nextAttemptAt: timestamp({ mode: 'string' }),
});

export const userSettings = pgTable("UserSettings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid().notNull(),
	firstName: varchar({ length: 255 }),
	lastName: varchar({ length: 255 }),
	country: varchar({ length: 10 }),
	state: varchar({ length: 10 }),
	isLocked: boolean().default(false),
	systemPrompt: text(),
	codePrompt: text(),
	sheetPrompt: text(),
	suggestions: jsonb(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	defaultModel: varchar({ length: 100 }),
	defaultReasoning: boolean().default(false),
	xeroMultiOrgMode: boolean().default(false),
	xeroDefaultTenantId: varchar({ length: 255 }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "UserSettings_userId_User_id_fk"
		}).onDelete("cascade"),
	unique("UserSettings_userId_unique").on(table.userId),
]);

export const regulatoryDocument = pgTable("RegulatoryDocument", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	country: varchar({ length: 2 }).notNull(),
	category: varchar({ length: 50 }).notNull(),
	title: text().notNull(),
	sourceUrl: text().notNull(),
	content: text(),
	extractedText: text(),
	tokenCount: integer().default(0),
	effectiveDate: timestamp({ mode: 'string' }),
	expiryDate: timestamp({ mode: 'string' }),
	status: varchar({ length: 20 }).default('active').notNull(),
	scrapedAt: timestamp({ mode: 'string' }).notNull(),
	lastCheckedAt: timestamp({ mode: 'string' }).notNull(),
	metadata: jsonb(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	searchVector: text("search_vector"),
}, (table) => [
	index("regulatory_document_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("regulatory_document_country_idx").using("btree", table.country.asc().nullsLast().op("text_ops")),
	index("regulatory_document_source_url_idx").using("btree", table.sourceUrl.asc().nullsLast().op("text_ops")),
	index("regulatory_document_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("RegulatoryDocument_sourceUrl_unique").on(table.sourceUrl),
]);

export const xeroConnection = pgTable("XeroConnection", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid().notNull(),
	tenantId: varchar({ length: 255 }).notNull(),
	tenantName: varchar({ length: 255 }),
	accessToken: text().notNull(),
	refreshToken: text().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	scopes: jsonb().notNull(),
	isActive: boolean().default(true).notNull(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	tenantType: varchar({ length: 50 }),
	isPrimary: boolean().default(false).notNull(),
	displayOrder: integer().default(0),
	connectionId: varchar({ length: 255 }),
	authEventId: varchar({ length: 255 }),
	createdDateUtc: timestamp({ mode: 'string' }),
	updatedDateUtc: timestamp({ mode: 'string' }),
}, (table) => [
	uniqueIndex("xero_connection_id_idx").using("btree", table.connectionId.asc().nullsLast().op("text_ops")).where(sql`("connectionId" IS NOT NULL)`),
	uniqueIndex("xero_connection_user_tenant_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.tenantId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "XeroConnection_userId_User_id_fk"
		}).onDelete("cascade"),
]);

export const regulatoryScrapeJob = pgTable("RegulatoryScrapeJob", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sourceUrl: text().notNull(),
	country: varchar({ length: 2 }),
	category: varchar({ length: 50 }),
	status: varchar({ length: 20 }).default('pending').notNull(),
	startedAt: timestamp({ mode: 'string' }),
	completedAt: timestamp({ mode: 'string' }),
	documentsScraped: integer().default(0),
	documentsUpdated: integer().default(0),
	documentsArchived: integer().default(0),
	errorMessage: text(),
	metadata: jsonb(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("regulatory_scrape_job_country_idx").using("btree", table.country.asc().nullsLast().op("text_ops")),
	index("regulatory_scrape_job_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("regulatory_scrape_job_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const qaReviewRequest = pgTable("QaReviewRequest", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid().notNull(),
	messageId: text().notNull(),
	query: text().notNull(),
	response: text().notNull(),
	confidence: integer().notNull(),
	citations: jsonb(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	assignedTo: uuid(),
	resolutionNotes: text(),
	createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
	resolvedAt: timestamp({ mode: 'string' }),
}, (table) => [
	index("qa_review_request_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("qa_review_request_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "QaReviewRequest_userId_User_id_fk"
		}),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [user.id],
			name: "QaReviewRequest_assignedTo_User_id_fk"
		}),
]);

export const vote = pgTable("Vote", {
	chatId: uuid().notNull(),
	messageId: uuid().notNull(),
	isUpvoted: boolean().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Vote_chatId_Chat_id_fk"
		}),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [message.id],
			name: "Vote_messageId_Message_id_fk"
		}),
	primaryKey({ columns: [table.chatId, table.messageId], name: "Vote_chatId_messageId_pk"}),
]);

export const voteV2 = pgTable("Vote_v2", {
	chatId: uuid().notNull(),
	messageId: uuid().notNull(),
	isUpvoted: boolean().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.chatId],
			foreignColumns: [chat.id],
			name: "Vote_v2_chatId_Chat_id_fk"
		}),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messageV2.id],
			name: "Vote_v2_messageId_Message_v2_id_fk"
		}),
	primaryKey({ columns: [table.chatId, table.messageId], name: "Vote_v2_chatId_messageId_pk"}),
]);

export const document = pgTable("Document", {
	id: uuid().defaultRandom().notNull(),
	createdAt: timestamp({ mode: 'string' }).notNull(),
	title: text().notNull(),
	content: text(),
	userId: uuid().notNull(),
	text: varchar().default('text').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "Document_userId_User_id_fk"
		}),
	primaryKey({ columns: [table.id, table.createdAt], name: "Document_id_createdAt_pk"}),
]);
