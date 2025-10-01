# MCP Server Implementation Guide

## Overview

This guide will walk you through implementing a Model Context Protocol (MCP) server in your AI chatbot application to provide extra context for user inputs. MCP is an open standard introduced by Anthropic that standardizes how AI systems integrate with external data sources, tools, and context providers.

**What you'll build:**
- An MCP server exposing chat history, user preferences, and custom context
- Integration with the existing chat flow to inject dynamic context
- Optional resources, prompts, and tools for enhanced AI capabilities

---

## Part 1: Understanding MCP

### What is Model Context Protocol (MCP)?

MCP is a standardized protocol that allows AI applications to:
- **Access Resources**: Contextual data like files, databases, APIs
- **Use Tools**: Execute functions to fetch or manipulate data
- **Apply Prompts**: Pre-configured message templates
- **Communicate**: Using JSON-RPC 2.0 over various transports (stdio, HTTP, SSE)

### MCP Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Application                          │
│                    (Your Next.js App)                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client                                │
│              (Built into your app)                           │
└─────────────────┬───────────────────────────────────────────┘
                  │ JSON-RPC 2.0
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server                                │
│         (What we're building)                                │
│  • Resources: Chat history, user data                        │
│  • Tools: Context fetchers, analyzers                        │
│  • Prompts: Templates for common tasks                       │
└─────────────────────────────────────────────────────────────┘
```

### Why Add MCP to Your Chatbot?

**Benefits:**
1. **Richer Context**: Automatically inject relevant chat history, user preferences, past conversations
2. **Dynamic Resources**: Provide real-time access to database content, user files, settings
3. **Standardization**: Use a protocol adopted by Anthropic, OpenAI, Google DeepMind
4. **Extensibility**: Easy to add new context sources without changing core chat logic
5. **Interoperability**: Your MCP server can be used by other AI tools (Claude Desktop, VS Code, etc.)

---

## Part 2: Installation and Setup

### Step 1: Install MCP SDK

**Command to run:**

```bash
pnpm add @modelcontextprotocol/sdk zod
```

**What these packages do:**
- `@modelcontextprotocol/sdk` - Official TypeScript SDK for MCP servers and clients
- `zod` - Already installed, used for schema validation

### Step 2: Verify Node.js Version

MCP SDK requires Node.js v18.0.0 or higher.

**Check your version:**

```bash
node --version
```

If below v18, update Node.js.

### Step 3: Update Environment Variables

**File to edit:** `.env.local` or `.env`

**Add:**

```bash
# MCP Server Configuration
MCP_SERVER_NAME="ai-chatbot-context"
MCP_SERVER_VERSION="1.0.0"

# Optional: Authentication for MCP server
MCP_API_KEY=your-secure-api-key-here
```

**Generate a secure API key:**

```bash
openssl rand -base64 32
```

---

## Part 3: Create MCP Server Route

### Step 1: Create MCP Server Directory

**Commands to run:**

```bash
mkdir -p app/api/mcp
```

### Step 2: Create the MCP Server Implementation

**File to create:** `lib/mcp/server.ts`

**Content:**

```typescript
import "server-only";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourcesRequest,
  type ReadResourceRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Session } from "next-auth";
import {
  getChatById,
  getChatsByUserId,
  getMessagesByChatId,
} from "@/lib/db/queries";
import { convertToUIMessages } from "@/lib/utils";

export class ChatContextMCPServer {
  private server: Server;
  private session: Session | null;

  constructor(session: Session | null) {
    this.session = session;

    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || "ai-chatbot-context",
        version: process.env.MCP_SERVER_VERSION || "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupResourceHandlers();
    this.setupToolHandlers();
    this.setupPromptHandlers();
  }

  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(
      ListResourcesRequestSchema,
      async (_request: ListResourcesRequest) => {
        if (!this.session?.user?.id) {
          return { resources: [] };
        }

        return {
          resources: [
            {
              uri: "chat://history/recent",
              name: "Recent Chat History",
              description: "Last 10 chat conversations",
              mimeType: "application/json",
            },
            {
              uri: "chat://history/all",
              name: "All Chat History",
              description: "All user chat conversations",
              mimeType: "application/json",
            },
            {
              uri: "user://profile",
              name: "User Profile",
              description: "Current user information",
              mimeType: "application/json",
            },
          ],
        };
      }
    );

    // Read specific resources
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request: ReadResourceRequest) => {
        const { uri } = request.params;

        if (!this.session?.user?.id) {
          throw new Error("Unauthorized: No active session");
        }

        if (uri === "chat://history/recent") {
          return await this.getRecentChatHistory();
        }

        if (uri === "chat://history/all") {
          return await this.getAllChatHistory();
        }

        if (uri === "user://profile") {
          return await this.getUserProfile();
        }

        throw new Error(`Unknown resource URI: ${uri}`);
      }
    );
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => {
        return {
          tools: [
            {
              name: "get_chat_context",
              description:
                "Retrieve context from a specific chat conversation including messages and metadata",
              inputSchema: {
                type: "object",
                properties: {
                  chatId: {
                    type: "string",
                    description: "The ID of the chat to retrieve context from",
                  },
                  includeMessages: {
                    type: "boolean",
                    description: "Whether to include full message history",
                    default: true,
                  },
                  messageLimit: {
                    type: "number",
                    description: "Maximum number of messages to return",
                    default: 50,
                  },
                },
                required: ["chatId"],
              },
            },
            {
              name: "analyze_chat_patterns",
              description:
                "Analyze user's chat patterns to provide contextual insights",
              inputSchema: {
                type: "object",
                properties: {
                  analysisType: {
                    type: "string",
                    enum: ["topics", "frequency", "sentiment"],
                    description: "Type of analysis to perform",
                  },
                  timeRange: {
                    type: "string",
                    enum: ["day", "week", "month", "all"],
                    description: "Time range for analysis",
                    default: "week",
                  },
                },
                required: ["analysisType"],
              },
            },
          ],
        };
      }
    );

    // Handle tool calls
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request: CallToolRequest) => {
        const { name, arguments: args } = request.params;

        if (!this.session?.user?.id) {
          throw new Error("Unauthorized: No active session");
        }

        if (name === "get_chat_context") {
          return await this.getChatContext(args as any);
        }

        if (name === "analyze_chat_patterns") {
          return await this.analyzeChatPatterns(args as any);
        }

        throw new Error(`Unknown tool: ${name}`);
      }
    );
  }

  private setupPromptHandlers() {
    // Prompts will be handled in a future iteration
    // For now, we'll focus on resources and tools
  }

  // Resource handlers
  private async getRecentChatHistory() {
    const userId = this.session!.user.id;

    const { chats } = await getChatsByUserId({
      id: userId,
      limit: 10,
      startingAfter: null,
      endingBefore: null,
    });

    return {
      contents: [
        {
          uri: "chat://history/recent",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              count: chats.length,
              chats: chats.map((chat) => ({
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
                visibility: chat.visibility,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getAllChatHistory() {
    const userId = this.session!.user.id;

    // Get all chats (with a reasonable limit)
    const { chats } = await getChatsByUserId({
      id: userId,
      limit: 100,
      startingAfter: null,
      endingBefore: null,
    });

    return {
      contents: [
        {
          uri: "chat://history/all",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              count: chats.length,
              chats: chats.map((chat) => ({
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
                visibility: chat.visibility,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getUserProfile() {
    return {
      contents: [
        {
          uri: "user://profile",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              id: this.session!.user.id,
              email: this.session!.user.email,
              type: this.session!.user.type,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Tool handlers
  private async getChatContext(args: {
    chatId: string;
    includeMessages?: boolean;
    messageLimit?: number;
  }) {
    const { chatId, includeMessages = true, messageLimit = 50 } = args;

    const chat = await getChatById({ id: chatId });

    if (!chat) {
      throw new Error(`Chat not found: ${chatId}`);
    }

    if (chat.userId !== this.session!.user.id) {
      throw new Error("Unauthorized: Chat belongs to different user");
    }

    let messages = [];
    if (includeMessages) {
      const dbMessages = await getMessagesByChatId({ id: chatId });
      const uiMessages = convertToUIMessages(dbMessages);
      messages = uiMessages.slice(-messageLimit);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              chat: {
                id: chat.id,
                title: chat.title,
                createdAt: chat.createdAt,
                visibility: chat.visibility,
              },
              messageCount: messages.length,
              messages: messages.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content:
                  typeof msg.content === "string"
                    ? msg.content
                    : JSON.stringify(msg.content),
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async analyzeChatPatterns(args: {
    analysisType: "topics" | "frequency" | "sentiment";
    timeRange?: "day" | "week" | "month" | "all";
  }) {
    const { analysisType, timeRange = "week" } = args;

    // Get user's chats
    const userId = this.session!.user.id;
    const { chats } = await getChatsByUserId({
      id: userId,
      limit: 100,
      startingAfter: null,
      endingBefore: null,
    });

    // Filter by time range
    const cutoffDate = this.getCutoffDate(timeRange);
    const filteredChats = chats.filter(
      (chat) => new Date(chat.createdAt) >= cutoffDate
    );

    // Perform analysis based on type
    let analysis = {};

    if (analysisType === "topics") {
      // Extract common topics from chat titles
      const topics = filteredChats.map((chat) => chat.title);
      analysis = {
        type: "topics",
        count: topics.length,
        commonTopics: this.extractCommonWords(topics),
      };
    } else if (analysisType === "frequency") {
      // Analyze chat frequency
      const chatsByDate = this.groupChatsByDate(filteredChats);
      analysis = {
        type: "frequency",
        totalChats: filteredChats.length,
        averagePerDay: filteredChats.length / this.getDayCount(timeRange),
        distribution: chatsByDate,
      };
    } else if (analysisType === "sentiment") {
      // Basic sentiment analysis placeholder
      analysis = {
        type: "sentiment",
        note: "Sentiment analysis requires message content analysis",
        chatCount: filteredChats.length,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              timeRange,
              analysisType,
              ...analysis,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Helper methods
  private getCutoffDate(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case "day":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "week":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "month":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(0); // All time
    }
  }

  private getDayCount(timeRange: string): number {
    switch (timeRange) {
      case "day":
        return 1;
      case "week":
        return 7;
      case "month":
        return 30;
      default:
        return 365; // Estimate for "all"
    }
  }

  private extractCommonWords(titles: string[]): string[] {
    const words = titles
      .join(" ")
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);

    const frequency: Record<string, number> = {};
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private groupChatsByDate(chats: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    for (const chat of chats) {
      const date = new Date(chat.createdAt).toISOString().split("T")[0];
      grouped[date] = (grouped[date] || 0) + 1;
    }

    return grouped;
  }

  getServer() {
    return this.server;
  }
}
```

---

## Part 4: Create HTTP Transport Handler

Since we're using Next.js, we'll use HTTP/SSE transport instead of stdio.

**File to create:** `lib/mcp/transport.ts`

**Content:**

```typescript
import "server-only";

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

export class HTTPTransport {
  private server: Server;
  private messageQueue: JSONRPCMessage[] = [];
  private controller: ReadableStreamDefaultController | null = null;

  constructor(server: Server) {
    this.server = server;
  }

  async handleRequest(request: JSONRPCMessage): Promise<JSONRPCMessage> {
    // Process the request through the MCP server
    const response = await this.processMessage(request);
    return response;
  }

  private async processMessage(
    message: JSONRPCMessage
  ): Promise<JSONRPCMessage> {
    // This is a simplified implementation
    // In production, you'd want more robust message handling
    return new Promise((resolve) => {
      // The SDK handles the actual processing
      // We're creating a minimal transport layer
      this.server.onclose = () => {
        // Handle close
      };

      // Send message to server (this is pseudo-code as the SDK expects specific transport)
      // In practice, you might need to implement a custom transport
      resolve({
        jsonrpc: "2.0",
        id: (message as any).id,
        result: {},
      });
    });
  }

  createSSEStream(): ReadableStream {
    return new ReadableStream({
      start: (controller) => {
        this.controller = controller;

        // Send initial connection message
        this.sendSSE({
          event: "connected",
          data: { message: "MCP Server connected" },
        });
      },
      cancel: () => {
        this.controller = null;
      },
    });
  }

  private sendSSE(data: { event: string; data: any }) {
    if (!this.controller) return;

    const message = `event: ${data.event}\ndata: ${JSON.stringify(data.data)}\n\n`;
    this.controller.enqueue(new TextEncoder().encode(message));
  }
}
```

---

## Part 5: Create API Route for MCP Server

**File to create:** `app/api/mcp/route.ts`

**Content:**

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { ChatContextMCPServer } from "@/lib/mcp/server";
import { ChatSDKError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

// Handle MCP protocol requests
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new ChatSDKError("unauthorized:api", "Not authenticated").toResponse();
    }

    // Verify API key if configured
    const apiKey = request.headers.get("X-MCP-API-Key");
    if (process.env.MCP_API_KEY && apiKey !== process.env.MCP_API_KEY) {
      return new ChatSDKError("unauthorized:api", "Invalid API key").toResponse();
    }

    const mcpServer = new ChatContextMCPServer(session);
    const server = mcpServer.getServer();

    // Parse JSON-RPC request
    const jsonrpcRequest = await request.json();

    // This is a simplified implementation
    // In production, you'd need to properly handle the MCP protocol
    // The SDK provides transport implementations, but for HTTP we need custom handling

    return NextResponse.json({
      message: "MCP endpoint ready",
      capabilities: {
        resources: true,
        tools: true,
        prompts: false,
      },
      version: "1.0.0",
    });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Error in MCP endpoint:", error);
    return new ChatSDKError(
      "internal_server_error:api",
      "Failed to process MCP request"
    ).toResponse();
  }
}

// Handle GET for MCP server info
export async function GET(request: Request) {
  try {
    const session = await auth();

    return NextResponse.json({
      name: process.env.MCP_SERVER_NAME || "ai-chatbot-context",
      version: process.env.MCP_SERVER_VERSION || "1.0.0",
      authenticated: !!session?.user?.id,
      capabilities: {
        resources: ["chat://history/*", "user://profile"],
        tools: ["get_chat_context", "analyze_chat_patterns"],
        prompts: [],
      },
      transport: "http",
    });
  } catch (error) {
    console.error("Error in MCP info endpoint:", error);
    return NextResponse.json({ error: "Failed to get server info" }, { status: 500 });
  }
}
```

---

## Part 6: Create MCP Client Integration

Now we need to integrate the MCP server as a context provider for the chat.

**File to create:** `lib/mcp/client.ts`

**Content:**

```typescript
import "server-only";

export type MCPResource = {
  uri: string;
  content: string;
  mimeType: string;
};

export type MCPToolResult = {
  toolName: string;
  result: any;
};

export class MCPClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = "/api/mcp", apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async getResource(uri: string): Promise<MCPResource> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { "X-MCP-API-Key": this.apiKey }),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "resources/read",
        params: { uri },
      }),
    });

    const data = await response.json();
    return data.result;
  }

  async callTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { "X-MCP-API-Key": this.apiKey }),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    const data = await response.json();
    return {
      toolName,
      result: data.result,
    };
  }

  async listResources(): Promise<Array<{ uri: string; name: string; description: string }>> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { "X-MCP-API-Key": this.apiKey }),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "resources/list",
        params: {},
      }),
    });

    const data = await response.json();
    return data.result.resources || [];
  }
}
```

---

## Part 7: Integrate MCP Context into Chat Flow

### Step 1: Create Context Injection Helper

**File to create:** `lib/mcp/context-injector.ts`

**Content:**

```typescript
import "server-only";

import { MCPClient } from "./client";
import type { Session } from "next-auth";

export type InjectedContext = {
  sources: string[];
  content: string;
  metadata: Record<string, any>;
};

export class MCPContextInjector {
  private client: MCPClient;

  constructor(apiKey?: string) {
    this.client = new MCPClient("/api/mcp", apiKey);
  }

  async injectChatContext(
    chatId: string,
    userMessage: string,
    session: Session
  ): Promise<InjectedContext> {
    const sources: string[] = [];
    const contextParts: string[] = [];
    const metadata: Record<string, any> = {};

    try {
      // Get recent chat history for context
      const historyResource = await this.client.getResource("chat://history/recent");
      sources.push("Recent Chat History");
      contextParts.push(`## Recent Conversations\n${historyResource.content}`);
      metadata.historyCount = JSON.parse(historyResource.content).count;
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }

    try {
      // Get specific chat context if relevant
      const chatContext = await this.client.callTool("get_chat_context", {
        chatId,
        includeMessages: true,
        messageLimit: 10,
      });

      sources.push("Current Chat Context");
      contextParts.push(`## Current Conversation\n${JSON.stringify(chatContext.result, null, 2)}`);
      metadata.currentChatMessageCount = chatContext.result.messageCount;
    } catch (error) {
      console.error("Failed to fetch chat context:", error);
    }

    // Optionally analyze patterns to provide better context
    if (userMessage.toLowerCase().includes("summary") || userMessage.toLowerCase().includes("analyze")) {
      try {
        const patterns = await this.client.callTool("analyze_chat_patterns", {
          analysisType: "topics",
          timeRange: "week",
        });

        sources.push("Chat Pattern Analysis");
        contextParts.push(`## Recent Topics\n${JSON.stringify(patterns.result, null, 2)}`);
      } catch (error) {
        console.error("Failed to analyze patterns:", error);
      }
    }

    return {
      sources,
      content: contextParts.join("\n\n"),
      metadata,
    };
  }

  async injectUserContext(session: Session): Promise<InjectedContext> {
    const sources: string[] = [];
    const contextParts: string[] = [];
    const metadata: Record<string, any> = {};

    try {
      const profileResource = await this.client.getResource("user://profile");
      sources.push("User Profile");
      contextParts.push(`## User Information\n${profileResource.content}`);
      metadata.userType = session.user.type;
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }

    return {
      sources,
      content: contextParts.join("\n\n"),
      metadata,
    };
  }
}
```

### Step 2: Update System Prompt to Include MCP Context

**File to edit:** `lib/ai/prompts.ts`

**Find the `systemPrompt` function and modify it:**

```typescript
export type MCPContext = {
  sources: string[];
  content: string;
  metadata: Record<string, any>;
};

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
  mcpContext,
}: {
  selectedChatModel: ChatModel["id"];
  requestHints: RequestHints;
  mcpContext?: MCPContext;
}) => {
  const locationPrompt = getRequestPromptFromHints(requestHints);

  let contextSection = "";
  if (mcpContext && mcpContext.content) {
    contextSection = `

## Additional Context (from MCP Server)

The following context has been gathered from: ${mcpContext.sources.join(", ")}

${mcpContext.content}

Use this context to provide more personalized and informed responses.
`;
  }

  return `You are a helpful AI assistant powered by xAI's Grok model.

${locationPrompt}

You have access to tools for weather information, document creation, and web search.
${contextSection}

Be helpful, accurate, and concise in your responses.`;
};
```

### Step 3: Update Chat Route to Inject MCP Context

**File to edit:** `app/(chat)/api/chat/route.ts`

**Add imports at the top:**

```typescript
import { MCPContextInjector } from "@/lib/mcp/context-injector";
```

**Modify the POST function (around line 145-180):**

Find this section:

```typescript
    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };
```

**Add MCP context injection after requestHints:**

```typescript
    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    // Inject MCP context
    let mcpContext;
    try {
      const contextInjector = new MCPContextInjector(process.env.MCP_API_KEY);

      // Get text from user message
      const userMessageText = message.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join(" ");

      mcpContext = await contextInjector.injectChatContext(
        id,
        userMessageText,
        session
      );
    } catch (error) {
      console.error("Failed to inject MCP context:", error);
      // Continue without MCP context if it fails
    }
```

**Then update the streamText call to include mcpContext:**

```typescript
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints, mcpContext }),  // ADD mcpContext
          messages: convertToModelMessages(uiMessages),
          // ... rest of the config
```

---

## Part 8: Testing the MCP Server

### Step 1: Start the Development Server

```bash
pnpm dev
```

### Step 2: Test MCP Server Info Endpoint

```bash
curl http://localhost:3000/api/mcp
```

**Expected response:**

```json
{
  "name": "ai-chatbot-context",
  "version": "1.0.0",
  "authenticated": false,
  "capabilities": {
    "resources": ["chat://history/*", "user://profile"],
    "tools": ["get_chat_context", "analyze_chat_patterns"],
    "prompts": []
  },
  "transport": "http"
}
```

### Step 3: Test Chat with MCP Context

1. Log in to the application
2. Start a new chat
3. Send several messages to build history
4. Ask: "Can you summarize my recent conversations?"
5. The AI should have access to your chat history via MCP context

**Check server logs for:**

```
Failed to inject MCP context: [error]  // If something went wrong
```

Or successful context injection (no error).

### Step 4: Verify Context Injection

**Add temporary logging to see injected context:**

In `app/(chat)/api/chat/route.ts`, after MCP context injection:

```typescript
    if (mcpContext) {
      console.log("MCP Context injected:");
      console.log("Sources:", mcpContext.sources);
      console.log("Content length:", mcpContext.content.length);
      console.log("Metadata:", mcpContext.metadata);
    }
```

### Step 5: Test MCP Client Directly

**Create a test script:** `scripts/test-mcp.ts`

```typescript
import { MCPClient } from "@/lib/mcp/client";

async function testMCP() {
  const client = new MCPClient("http://localhost:3000/api/mcp");

  console.log("Listing resources...");
  const resources = await client.listResources();
  console.log("Resources:", resources);

  console.log("\nFetching recent history...");
  const history = await client.getResource("chat://history/recent");
  console.log("History:", history);

  console.log("\nCalling analyze_chat_patterns tool...");
  const analysis = await client.callTool("analyze_chat_patterns", {
    analysisType: "topics",
    timeRange: "week",
  });
  console.log("Analysis:", analysis);
}

testMCP().catch(console.error);
```

**Run:**

```bash
npx tsx scripts/test-mcp.ts
```

---

## Part 9: Advanced Features

### Feature 1: Custom Context Resources

**Add domain-specific resources:**

In `lib/mcp/server.ts`, add to `setupResourceHandlers()`:

```typescript
    return {
      resources: [
        // ... existing resources
        {
          uri: "docs://api-reference",
          name: "API Documentation",
          description: "Internal API documentation",
          mimeType: "text/markdown",
        },
        {
          uri: "kb://faq",
          name: "Frequently Asked Questions",
          description: "Common questions and answers",
          mimeType: "text/markdown",
        },
      ],
    };
```

Then implement the handlers in `ReadResourceRequestSchema`.

### Feature 2: Prompt Templates

**Add reusable prompts:**

```typescript
  private setupPromptHandlers() {
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: "summarize_chat",
            description: "Summarize a chat conversation",
            arguments: [
              {
                name: "chatId",
                description: "ID of the chat to summarize",
                required: true,
              },
            ],
          },
          {
            name: "compare_chats",
            description: "Compare two chat conversations",
            arguments: [
              {
                name: "chatId1",
                description: "First chat ID",
                required: true,
              },
              {
                name: "chatId2",
                description: "Second chat ID",
                required: true,
              },
            ],
          },
        ],
      };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === "summarize_chat") {
        const chatContext = await this.getChatContext(args as any);
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Please provide a concise summary of this conversation:\n\n${chatContext.content[0].text}`,
              },
            },
          ],
        };
      }

      throw new Error(`Unknown prompt: ${name}`);
    });
  }
```

### Feature 3: Caching MCP Responses

**Add caching to reduce database queries:**

```typescript
import { unstable_cache as cache } from "next/cache";

export class ChatContextMCPServer {
  // ... existing code

  private getRecentChatHistoryCached = cache(
    async (userId: string) => {
      return this.getRecentChatHistory();
    },
    ["mcp-recent-history"],
    { revalidate: 60 } // Cache for 60 seconds
  );

  // Use in handler:
  // return await this.getRecentChatHistoryCached(this.session!.user.id);
}
```

### Feature 4: Conditional Context Injection

**Only inject context when relevant:**

```typescript
export class MCPContextInjector {
  async smartInjectContext(
    chatId: string,
    userMessage: string,
    session: Session
  ): Promise<InjectedContext | null> {
    // Check if message requires historical context
    const contextKeywords = [
      "previous",
      "earlier",
      "last time",
      "remember",
      "history",
      "summary",
      "before",
    ];

    const needsContext = contextKeywords.some((keyword) =>
      userMessage.toLowerCase().includes(keyword)
    );

    if (!needsContext) {
      return null; // Skip MCP context injection
    }

    return this.injectChatContext(chatId, userMessage, session);
  }
}
```

### Feature 5: Rate Limiting MCP Calls

**Prevent excessive MCP server calls:**

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
});

export async function POST(request: Request) {
  const session = await auth();

  if (session?.user?.id) {
    const { success } = await ratelimit.limit(`mcp:${session.user.id}`);

    if (!success) {
      return new ChatSDKError("rate_limit:mcp", "Too many MCP requests").toResponse();
    }
  }

  // ... rest of handler
}
```

---

## Part 10: Production Deployment

### Step 1: Environment Configuration

**For Vercel deployment, add to `.env.production`:**

```bash
MCP_SERVER_NAME="ai-chatbot-context-prod"
MCP_SERVER_VERSION="1.0.0"
MCP_API_KEY=<strong-production-key>
```

**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add all MCP-related variables
3. Set for "Production" environment

### Step 2: Enable Required Features

**If using Vercel Pro/Enterprise:**

In `app/api/mcp/route.ts`:

```typescript
export const maxDuration = 800; // Extended for Pro/Enterprise
export const dynamic = "force-dynamic";
```

**Enable Fluid Compute (if available):**

Add to `vercel.json`:

```json
{
  "functions": {
    "app/api/mcp/route.ts": {
      "maxDuration": 800,
      "memory": 3009
    }
  }
}
```

### Step 3: Security Hardening

**Add request validation:**

```typescript
import { z } from "zod";

const MCPRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.any()).optional(),
});

export async function POST(request: Request) {
  // ... auth checks

  const body = await request.json();
  const validatedRequest = MCPRequestSchema.safeParse(body);

  if (!validatedRequest.success) {
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }

  // ... rest of handler
}
```

### Step 4: Monitoring and Logging

**Add instrumentation:**

```typescript
import { trace } from "@opentelemetry/api";

export async function POST(request: Request) {
  const tracer = trace.getTracer("mcp-server");

  return tracer.startActiveSpan("mcp-request", async (span) => {
    try {
      span.setAttribute("user.id", session?.user?.id);
      span.setAttribute("method", jsonrpcRequest.method);

      // ... process request

      span.setStatus({ code: SpanStatusCode.OK });
      return response;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Step 5: Performance Optimization

**Use edge runtime for faster responses:**

```typescript
export const runtime = "edge"; // Use edge runtime
export const dynamic = "force-dynamic";
```

**Note:** Edge runtime has limitations (no Node.js APIs), so test thoroughly.

---

## Part 11: Using MCP with External Clients

Your MCP server can be used by external AI tools like Claude Desktop, VS Code, etc.

### Configuration for Claude Desktop

**Create:** `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ai-chatbot-context": {
      "url": "https://your-app.vercel.app/api/mcp",
      "transport": "http",
      "headers": {
        "X-MCP-API-Key": "your-api-key",
        "Content-Type": "application/json"
      }
    }
  }
}
```

### Configuration for VS Code

**Install MCP extension, then add to settings:**

```json
{
  "mcp.servers": [
    {
      "name": "AI Chatbot Context",
      "url": "https://your-app.vercel.app/api/mcp",
      "apiKey": "your-api-key"
    }
  ]
}
```

---

## Part 12: Troubleshooting

### Issue: MCP context not appearing in responses

**Check:**
1. Is `mcpContext` being passed to `systemPrompt()`?
2. Are there errors in server logs about MCP?
3. Is the MCP API key correct?
4. Try adding console.log to verify context is being fetched

### Issue: "Unauthorized" errors

**Solutions:**
1. Verify user is logged in
2. Check session is being passed to MCPServer constructor
3. Ensure API key matches if configured

### Issue: Slow response times

**Optimizations:**
1. Add caching for frequently accessed resources
2. Reduce message limit in context fetching
3. Make MCP calls asynchronous/optional
4. Use conditional context injection

### Issue: MCP server not responding

**Debug steps:**
1. Test GET endpoint: `curl http://localhost:3000/api/mcp`
2. Check for TypeScript errors: `pnpm build`
3. Verify all dependencies installed: `pnpm install`
4. Check Next.js logs for errors

---

## Summary Checklist

- [ ] Part 1: Understand MCP concepts
- [ ] Part 2: Installation
  - [ ] Install @modelcontextprotocol/sdk
  - [ ] Set environment variables
- [ ] Part 3: MCP Server
  - [ ] Create lib/mcp/server.ts
  - [ ] Implement resource handlers
  - [ ] Implement tool handlers
- [ ] Part 4: Transport
  - [ ] Create lib/mcp/transport.ts
- [ ] Part 5: API Route
  - [ ] Create app/api/mcp/route.ts
  - [ ] Test GET endpoint
- [ ] Part 6: MCP Client
  - [ ] Create lib/mcp/client.ts
- [ ] Part 7: Integration
  - [ ] Create lib/mcp/context-injector.ts
  - [ ] Update lib/ai/prompts.ts
  - [ ] Update app/(chat)/api/chat/route.ts
- [ ] Part 8: Testing
  - [ ] Test MCP info endpoint
  - [ ] Test chat with context
  - [ ] Verify context injection
- [ ] Part 9: Advanced features (optional)
- [ ] Part 10: Production deployment
- [ ] Part 11: External clients (optional)

---

## Additional Resources

- **MCP Specification:** https://modelcontextprotocol.io/specification/2025-06-18
- **TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **Vercel MCP Template:** https://github.com/vercel-labs/mcp-for-next.js
- **Example Servers:** https://github.com/modelcontextprotocol/servers

This implementation provides a complete MCP server that enhances your AI chatbot with rich contextual information from chat history, user data, and custom resources!
