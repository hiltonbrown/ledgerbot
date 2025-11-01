import { relations } from "drizzle-orm/relations";
import {
  chat,
  chatXeroContext,
  contextFile,
  document,
  message,
  messageV2,
  qaReviewRequest,
  stream,
  suggestion,
  user,
  userSettings,
  vote,
  voteV2,
  xeroConnection,
} from "./schema";

export const suggestionRelations = relations(suggestion, ({ one }) => ({
  user: one(user, {
    fields: [suggestion.userId],
    references: [user.id],
  }),
  document: one(document, {
    fields: [suggestion.documentId],
    references: [document.createdAt],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  suggestions: many(suggestion),
  chats: many(chat),
  contextFiles: many(contextFile),
  userSettings: many(userSettings),
  xeroConnections: many(xeroConnection),
  qaReviewRequests_userId: many(qaReviewRequest, {
    relationName: "qaReviewRequest_userId_user_id",
  }),
  qaReviewRequests_assignedTo: many(qaReviewRequest, {
    relationName: "qaReviewRequest_assignedTo_user_id",
  }),
  documents: many(document),
}));

export const documentRelations = relations(document, ({ one, many }) => ({
  suggestions: many(suggestion),
  user: one(user, {
    fields: [document.userId],
    references: [user.id],
  }),
}));

export const messageRelations = relations(message, ({ one, many }) => ({
  chat: one(chat, {
    fields: [message.chatId],
    references: [chat.id],
  }),
  votes: many(vote),
}));

export const chatRelations = relations(chat, ({ one, many }) => ({
  messages: many(message),
  messageV2s: many(messageV2),
  streams: many(stream),
  user: one(user, {
    fields: [chat.userId],
    references: [user.id],
  }),
  chatXeroContexts: many(chatXeroContext),
  votes: many(vote),
  voteV2s: many(voteV2),
}));

export const messageV2Relations = relations(messageV2, ({ one, many }) => ({
  chat: one(chat, {
    fields: [messageV2.chatId],
    references: [chat.id],
  }),
  voteV2s: many(voteV2),
}));

export const streamRelations = relations(stream, ({ one }) => ({
  chat: one(chat, {
    fields: [stream.chatId],
    references: [chat.id],
  }),
}));

export const contextFileRelations = relations(contextFile, ({ one }) => ({
  user: one(user, {
    fields: [contextFile.userId],
    references: [user.id],
  }),
}));

export const chatXeroContextRelations = relations(
  chatXeroContext,
  ({ one }) => ({
    chat: one(chat, {
      fields: [chatXeroContext.chatId],
      references: [chat.id],
    }),
  })
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(user, {
    fields: [userSettings.userId],
    references: [user.id],
  }),
}));

export const xeroConnectionRelations = relations(xeroConnection, ({ one }) => ({
  user: one(user, {
    fields: [xeroConnection.userId],
    references: [user.id],
  }),
}));

export const qaReviewRequestRelations = relations(
  qaReviewRequest,
  ({ one }) => ({
    user_userId: one(user, {
      fields: [qaReviewRequest.userId],
      references: [user.id],
      relationName: "qaReviewRequest_userId_user_id",
    }),
    user_assignedTo: one(user, {
      fields: [qaReviewRequest.assignedTo],
      references: [user.id],
      relationName: "qaReviewRequest_assignedTo_user_id",
    }),
  })
);

export const voteRelations = relations(vote, ({ one }) => ({
  chat: one(chat, {
    fields: [vote.chatId],
    references: [chat.id],
  }),
  message: one(message, {
    fields: [vote.messageId],
    references: [message.id],
  }),
}));

export const voteV2Relations = relations(voteV2, ({ one }) => ({
  chat: one(chat, {
    fields: [voteV2.chatId],
    references: [chat.id],
  }),
  messageV2: one(messageV2, {
    fields: [voteV2.messageId],
    references: [messageV2.id],
  }),
}));
