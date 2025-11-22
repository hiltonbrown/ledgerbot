# Gemini in LedgerBot

This document outlines the specific roles and implementations of Google's Gemini models within the LedgerBot application. For general project information, including setup, architecture, and contribution guidelines, please refer to `README.md` and other relevant documentation files.

## Gemini Integration

Google's Gemini models are integrated into LedgerBot in two primary ways: as a user-selectable model in the main chat interface and as a specialized model for the "Chat with PDF" feature.

### 1. User-Selectable Chat Model

The `google-gemini-2-5-flash` model is available to all users as a selectable option for general-purpose chat. It is configured as a "reasoning model" within the application, meaning it is expected to provide high-quality, reasoned responses across a wide range of topics.

The model is defined in `lib/ai/models.ts` as part of the `chatModels` array:

```typescript
// lib/ai/models.ts

export const chatModels: ChatModel[] = [
  // ... other models
  {
    id: "google-gemini-2-5-flash",
    name: "Google Gemini 2.5 Flash",
    description: "Speed-optimized Gemini model with strong reasoning",
    vercelId: "google/gemini-2.5-flash",
    isReasoning: true,
  },
];
```

### 2. Specialized "Chat with PDF" Model

The `google-gemini-2-5-flash` model is also used in a specific, hardcoded role within the document management agent. It powers the "Chat with PDF" feature, where it is used to answer user questions based on the content of an uploaded PDF document.

This implementation can be found in `lib/agents/docmanagement/workflow.ts`, where the `QA_MODEL` constant is set to `google-gemini-2-5-flash`:

```typescript
// lib/agents/docmanagement/workflow.ts

const QA_MODEL = "google-gemini-2-5-flash";

// ...

export async function answerPdfQuestion({
  // ...
}: {
  // ...
}): Promise<PdfAnswerResult> {
  // ...
  const { text: responseText } = await generateText({
    model: myProvider.languageModel(QA_MODEL),
    system: QA_SYSTEM_PROMPT,
    prompt,
    temperature: 0.2,
  });
  // ...
}
```

This targeted use of Gemini for a specific task highlights the application's strategy of using different models for different purposes to optimize for both cost and performance.

## Using the Gemini CLI for Codebase Analysis

The `gemini` CLI is an external tool that developers are expected to have installed on their local machines. It is not a script or a package included in this repository.

When analyzing the LedgerBot codebase or multiple files that might exceed context limits, you can use the `gemini` CLI with its massive context window. Use `gemini -p` to leverage Google Gemini's large context capacity for your Next.js TypeScript AI application.

### File and Directory Inclusion Syntax for LedgerBot

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to your LedgerBot project root:

#### LedgerBot-Specific Examples:

**Single file analysis:**
```bash
gemini -p "@package.json Explain the dependencies and project configuration for this AI chatbot"

gemini -p "@next.config.ts Analyze the Next.js configuration and any AI-specific settings"

gemini -p "@middleware.ts Review the middleware implementation for authentication and routing"
```

**Multiple configuration files:**
```bash
gemini -p "@package.json @tsconfig.json @next.config.ts Analyze the complete TypeScript and Next.js setup"

gemini -p "@drizzle.config.ts @lib/ Review the database configuration and schema implementation"
```

**Core application directories:**
```bash
gemini -p "@app/ Summarize the Next.js app router structure and API routes"

gemini -p "@components/ Analyze the React component architecture and UI patterns"

gemini -p "@lib/ Review the utility functions, database connections, and AI integrations"

gemini -p "@hooks/ Examine the custom React hooks and state management"
```

**Full project analysis:**
```bash
gemini -p "@./ Give me a complete overview of this AI chatbot project structure"

# Or use --all_files flag:
gemini --all_files -p "Analyze the entire LedgerBot project architecture and AI integrations"
```
