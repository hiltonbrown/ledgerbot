import type {
  CoreAssistantMessage,
  CoreToolMessage,
  UIMessage,
  UIMessagePart,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { formatISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import type { DBMessage, Document } from '@/lib/db/schema';
import type {
  DeepResearchAttachment,
  DeepResearchReportAttachment,
  DeepResearchSummaryAttachment,
} from '@/lib/mastra/deep-research-types';
import { ChatSDKError, type ErrorCode } from './errors';
import type {
  ChatMessage,
  ChatTools,
  CustomUIDataTypes,
  DeepResearchMessageMetadata,
  MessageMetadata,
} from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause } = await response.json();
      throw new ChatSDKError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: UIMessage[]) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Document[],
  index: number,
) {
  if (!documents) { return new Date(); }
  if (index > documents.length) { return new Date(); }

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: ResponseMessage[];
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) { return null; }

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getDeepResearchAttachments(
  attachments: unknown,
): DeepResearchAttachment[] {
  if (!attachments) {
    return [];
  }

  const raw = Array.isArray(attachments) ? attachments : [attachments];

  return raw.filter((item): item is DeepResearchAttachment => {
    if (!isRecord(item)) {
      return false;
    }

    const type = (item as { type?: unknown }).type;
    return (
      type === 'deep-research-summary' ||
      type === 'deep-research-report' ||
      type === 'deep-research-session'
    );
  });
}

function toSourceMetadata(
  sources:
    | DeepResearchSummaryAttachment['sources']
    | DeepResearchReportAttachment['sources'],
): DeepResearchMessageMetadata['sources'] {
  return sources.map((source) => ({
    index: source.index,
    title: source.title,
    url: source.url || undefined,
    reliability: source.reliability,
    confidence: source.confidence,
  }));
}

function attachmentToMetadata(
  attachment: DeepResearchAttachment,
): DeepResearchMessageMetadata {
  switch (attachment.type) {
    case 'deep-research-summary':
      return {
        sessionId: attachment.sessionId,
        status: 'awaiting-approval',
        question: attachment.question,
        plan: attachment.plan,
        confidence: attachment.confidence,
        sources: toSourceMetadata(attachment.sources),
        parentSessionId: attachment.parentSessionId,
      };
    case 'deep-research-report':
      return {
        sessionId: attachment.sessionId,
        status: 'report-generated',
        question: attachment.question,
        plan: attachment.plan,
        confidence: attachment.confidence,
        sources: toSourceMetadata(attachment.sources),
        parentSessionId: attachment.parentSessionId,
      };
    case 'deep-research-session':
      return {
        sessionId: attachment.sessionId,
        status: attachment.status,
        question: attachment.question,
        parentSessionId: attachment.parentSessionId,
      };
    default:
      return {
        sessionId: attachment.sessionId,
        status: 'error',
      };
  }
}

function deriveDeepResearchMetadataFromAttachments(
  attachments: unknown,
): DeepResearchMessageMetadata | undefined {
  const candidates = getDeepResearchAttachments(attachments);

  if (candidates.length === 0) {
    return undefined;
  }

  const priority: DeepResearchAttachment['type'][] = [
    'deep-research-summary',
    'deep-research-report',
    'deep-research-session',
  ];

  for (const type of priority) {
    const match = candidates.find((candidate) => candidate.type === type);
    if (match) {
      return attachmentToMetadata(match);
    }
  }

  return undefined;
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => {
    const metadata: MessageMetadata = {
      createdAt: formatISO(message.createdAt),
    };

    const deepResearchMetadata =
      deriveDeepResearchMetadataFromAttachments(message.attachments);

    if (deepResearchMetadata) {
      metadata.deepResearch = deepResearchMetadata;
    }

    return {
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system',
      parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
      metadata,
    };
  });
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}
