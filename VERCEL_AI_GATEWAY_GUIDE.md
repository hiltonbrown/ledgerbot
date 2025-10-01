# Vercel AI Gateway Implementation Guide for Junior Developers

This guide will walk you through understanding, verifying, and customizing the Vercel AI Gateway implementation in this AI chatbot project.

## Table of Contents
1. [What is Vercel AI Gateway?](#what-is-vercel-ai-gateway)
2. [Prerequisites](#prerequisites)
3. [Step 1: Verify Current Implementation](#step-1-verify-current-implementation)
4. [Step 2: Set Up Environment Variables](#step-2-set-up-environment-variables)
5. [Step 3: Understand the Provider Configuration](#step-3-understand-the-provider-configuration)
6. [Step 4: Test the Gateway](#step-4-test-the-gateway)
7. [Step 5: Monitor Gateway Usage](#step-5-monitor-gateway-usage)
8. [Step 6: Customize Gateway Behavior](#step-6-customize-gateway-behavior)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Configuration](#advanced-configuration)

---

## What is Vercel AI Gateway?

Vercel AI Gateway is a proxy service that sits between your application and AI providers (like OpenAI, Anthropic, xAI). It provides:

- **Rate Limiting**: Automatically controls request frequency
- **Caching**: Reduces costs by caching similar requests
- **Analytics**: Tracks token usage, costs, and performance
- **Load Balancing**: Distributes requests across providers
- **Error Handling**: Automatic retries and fallbacks

**Good News**: This project already has Vercel AI Gateway implemented! You just need to configure and verify it.

---

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 18+ installed
- [ ] pnpm package manager installed (`npm install -g pnpm`)
- [ ] Project dependencies installed (`pnpm install`)
- [ ] Access to Vercel dashboard (if deploying to production)
- [ ] Basic understanding of environment variables

---

## Step 1: Verify Current Implementation

### 1.1 Locate the Provider Configuration

Open the file `lib/ai/providers.ts` in your code editor.

**What to look for:**

```typescript
const provider = createOpenAI({
  baseURL: 'https://gateway.ai.anthropic.com/v1',
  apiKey: process.env.AI_GATEWAY_API_KEY,
});
```

This code tells your application to route all AI requests through the Vercel AI Gateway.

### 1.2 Check the Models Configuration

In the same file, scroll down to see the model definitions:

```typescript
export const customModel = (apiIdentifier: string) => {
  return provider(apiIdentifier);
};

export const chat = provider('grok-2-vision-1212');
export const reasoning = provider('grok-3-mini');
export const title = provider('grok-2-1212');
export const artifact = provider('grok-2-1212');
```

These are the AI models currently configured to use the gateway.

**✅ Checkpoint**: You should see the gateway baseURL and model definitions.

---

## Step 2: Set Up Environment Variables

Environment variables store sensitive configuration like API keys.

### 2.1 Create Your Local Environment File

1. In your project root, locate the `.env.example` file
2. Create a copy and rename it to `.env.local`:

```bash
cp .env.example .env.local
```

### 2.2 Add Your AI Gateway API Key

Open `.env.local` in your editor and add:

```env
# Vercel AI Gateway API Key (for local development)
AI_GATEWAY_API_KEY=your_api_key_here
```

**Where to get your API key:**

1. Go to [vercel.com](https://vercel.com)
2. Navigate to your project dashboard
3. Click "Settings" → "Environment Variables"
4. Find or create `AI_GATEWAY_API_KEY`
5. Copy the value and paste it into `.env.local`

**Important Notes:**
- `.env.local` is git-ignored (never committed to version control)
- On Vercel deployments, this uses OIDC authentication automatically (no API key needed in production)
- Keep your API key secret!

### 2.3 Verify Other Required Variables

Your `.env.local` should also have:

```env
# Database
POSTGRES_URL=your_postgres_connection_string

# Authentication
AUTH_SECRET=your_auth_secret

# File Storage
BLOB_READ_WRITE_TOKEN=your_blob_token

# AI Gateway
AI_GATEWAY_API_KEY=your_gateway_api_key
```

**✅ Checkpoint**: Your `.env.local` file exists and contains the AI_GATEWAY_API_KEY.

---

## Step 3: Understand the Provider Configuration

Let's break down what's happening in `lib/ai/providers.ts`.

### 3.1 The Provider Setup

```typescript
const provider = createOpenAI({
  baseURL: 'https://gateway.ai.anthropic.com/v1',
  apiKey: process.env.AI_GATEWAY_API_KEY,
});
```

**What this does:**
- `createOpenAI()`: Creates an OpenAI-compatible provider (xAI uses OpenAI's API format)
- `baseURL`: Points to Vercel AI Gateway endpoint instead of directly to xAI
- `apiKey`: Reads from environment variables for authentication

### 3.2 Model Types

The project uses four different model types:

| Model Type | Purpose | Model Name |
|------------|---------|------------|
| `chat` | Main chat conversations | grok-2-vision-1212 |
| `reasoning` | Complex reasoning with `<think>` tags | grok-3-mini |
| `title` | Generate chat titles | grok-2-1212 |
| `artifact` | Generate artifacts (code, text, sheets) | grok-2-1212 |

### 3.3 How Requests Flow

```
User Message → Your App → Vercel AI Gateway → xAI Grok API → Response
                              ↓
                         (Analytics, Caching, Rate Limiting)
```

**✅ Checkpoint**: You understand how the gateway sits between your app and the AI provider.

---

## Step 4: Test the Gateway

Now let's verify the gateway is working correctly.

### 4.1 Start the Development Server

Open your terminal in the project root:

```bash
pnpm dev
```

You should see:

```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
```

### 4.2 Open the Application

1. Open your browser to `http://localhost:3000`
2. You'll see the login/register page

### 4.3 Sign In or Continue as Guest

Option A: **Continue as Guest** (fastest)
- Click "Continue as Guest" button
- You'll be taken to the chat interface

Option B: **Create an Account**
- Enter email and password
- Click "Sign Up"
- Sign in with your credentials

### 4.4 Send a Test Message

1. In the chat input, type: "Hello! Can you explain what you are?"
2. Press Enter or click Send
3. Watch for the streaming response

**What's happening behind the scenes:**
1. Your message is sent to `/api/chat/route.ts`
2. The API route uses the provider from `lib/ai/providers.ts`
3. Request goes through Vercel AI Gateway
4. Gateway forwards to xAI Grok API
5. Response streams back through the gateway to your app

### 4.5 Verify Success

**Signs it's working:**
- ✅ You see a streaming response (text appears word-by-word)
- ✅ No errors in browser console (press F12 to check)
- ✅ No errors in terminal where `pnpm dev` is running

**If you see errors, skip to [Troubleshooting](#troubleshooting)**

### 4.6 Test Advanced Features

Try these to verify full functionality:

**Test 1: Weather Tool**
```
What's the weather in San Francisco?
```

**Test 2: Create an Artifact**
```
Create a Python function that calculates fibonacci numbers
```

**Test 3: Reasoning Model**
- Send a complex question that requires step-by-step thinking
- Look for reasoning traces in the UI

**✅ Checkpoint**: You can send messages and receive AI responses.

---

## Step 5: Monitor Gateway Usage

If you're deploying to Vercel, you can monitor your gateway usage.

### 5.1 Access Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to the "Analytics" tab

### 5.2 View AI Gateway Metrics

In Analytics, look for:

- **Requests**: Total number of AI requests
- **Tokens Used**: Input and output tokens
- **Costs**: Estimated costs based on provider pricing
- **Response Times**: Average latency
- **Error Rates**: Failed requests

### 5.3 Understand the Metrics

**Token Usage:**
- Input tokens: Your prompt + context sent to the model
- Output tokens: The model's response
- Total tokens: Input + Output (used for billing)

**Example:**
```
Request: "Hello!" (input: ~10 tokens)
Response: "Hello! How can I help you today?" (output: ~15 tokens)
Total: ~25 tokens
```

### 5.4 Set Up Alerts (Optional)

In Vercel dashboard:
1. Go to "Settings" → "Notifications"
2. Set up alerts for:
   - High token usage
   - Elevated error rates
   - Budget thresholds

**✅ Checkpoint**: You know where to monitor gateway usage in production.

---

## Step 6: Customize Gateway Behavior

Now let's customize the gateway configuration for your needs.

### 6.1 Modify Rate Limits

Rate limits control how many requests users can make.

**Open:** `lib/ai/entitlements.ts`

```typescript
export const entitlementsByUserType = {
  guest: {
    maxRequestsPerMinute: 10,
    maxTokensPerRequest: 4096,
  },
  regular: {
    maxRequestsPerMinute: 50,
    maxTokensPerRequest: 8192,
  },
};
```

**Customization example:**

```typescript
export const entitlementsByUserType = {
  guest: {
    maxRequestsPerMinute: 5,      // Reduced from 10
    maxTokensPerRequest: 2048,    // Reduced from 4096
  },
  regular: {
    maxRequestsPerMinute: 100,    // Increased from 50
    maxTokensPerRequest: 16384,   // Increased from 8192
  },
};
```

**When to adjust:**
- Reduce guest limits to prevent abuse
- Increase regular user limits for premium features
- Lower token limits to control costs

### 6.2 Change Default Models

**Open:** `lib/ai/models.ts`

Current configuration:

```typescript
export const chat = provider('grok-2-vision-1212');
export const reasoning = provider('grok-3-mini');
export const title = provider('grok-2-1212');
export const artifact = provider('grok-2-1212');
```

**Example: Use a faster/cheaper model for titles:**

```typescript
export const title = provider('grok-beta'); // Faster, cheaper
```

**Example: Use more powerful model for reasoning:**

```typescript
export const reasoning = provider('grok-3-vision-1212'); // More capable
```

**Available xAI models:**
- `grok-2-1212` - Standard model
- `grok-2-vision-1212` - Vision capabilities
- `grok-3-mini` - Smaller, faster
- `grok-3-vision-1212` - Most capable
- `grok-beta` - Latest experimental features

### 6.3 Add Custom Model Configurations

You can add new model types for specific use cases.

**In `lib/ai/models.ts`, add:**

```typescript
// New model for summarization
export const summarization = provider('grok-3-mini', {
  temperature: 0.3,  // Lower temperature for more focused output
  maxTokens: 500,    // Limit output length
});
```

**Then use it in your API routes:**

```typescript
import { summarization } from '@/lib/ai/models';

// In your API route
const result = await generateText({
  model: summarization,
  prompt: 'Summarize this article: ...',
});
```

### 6.4 Configure Response Settings

**Open:** `app/(chat)/api/chat/route.ts`

Find the `streamText` call around line 200:

```typescript
const result = streamText({
  model: selectedModel,
  messages,
  system: systemPrompt,
  maxSteps: 5,
  experimental_activeTools: tools,
  // Add custom settings here
});
```

**Customization options:**

```typescript
const result = streamText({
  model: selectedModel,
  messages,
  system: systemPrompt,
  maxSteps: 5,
  experimental_activeTools: tools,

  // Creativity control
  temperature: 0.7,        // 0.0 (focused) to 2.0 (creative)

  // Token limits
  maxTokens: 4096,         // Maximum response length

  // Response control
  topP: 0.9,               // Nucleus sampling
  frequencyPenalty: 0.0,   // Penalize repeated tokens
  presencePenalty: 0.0,    // Penalize repeated topics
});
```

**✅ Checkpoint**: You can customize rate limits, models, and response settings.

---

## Troubleshooting

### Problem: "401 Unauthorized" Error

**Symptoms:**
- Chat doesn't respond
- Console shows 401 error
- Terminal shows authentication error

**Solution:**

1. Check `.env.local` has `AI_GATEWAY_API_KEY` set
2. Verify the API key is correct (no extra spaces)
3. Restart dev server: `Ctrl+C` then `pnpm dev`
4. Clear browser cache and reload

### Problem: "Rate Limit Exceeded"

**Symptoms:**
- Error message: "Too many requests"
- Requests work, then stop

**Solution:**

1. Open `lib/ai/entitlements.ts`
2. Increase `maxRequestsPerMinute` for your user type
3. Save and restart server

### Problem: "Model Not Found"

**Symptoms:**
- Error: "Model 'grok-xxx' does not exist"

**Solution:**

1. Check model name spelling in `lib/ai/models.ts`
2. Verify model is available in xAI's API
3. Update to a supported model name

### Problem: Slow Response Times

**Symptoms:**
- Messages take a long time to start streaming
- Laggy typing response

**Possible causes:**

1. **Large context window**: Too much chat history
   - **Fix**: Reduce history in `lib/db/queries.ts` `getChatById` function

2. **Heavy model**: Using most powerful (slowest) model
   - **Fix**: Switch to `grok-3-mini` for faster responses

3. **Network issues**: Slow connection to gateway
   - **Fix**: Check internet connection, try again

### Problem: "Failed to Fetch" Error

**Symptoms:**
- Cannot send messages
- Network error in console

**Solution:**

1. Verify dev server is running (`pnpm dev`)
2. Check `http://localhost:3000` is accessible
3. Ensure no firewall blocking requests
4. Check browser console for CORS errors

### Problem: Environment Variables Not Loading

**Symptoms:**
- `process.env.AI_GATEWAY_API_KEY` is undefined
- Gateway not authenticating

**Solution:**

1. Ensure file is named exactly `.env.local` (not `.env.txt`)
2. Restart dev server completely
3. Check file is in project root (same level as `package.json`)
4. Verify no syntax errors in `.env.local`

**✅ Checkpoint**: You know how to debug common gateway issues.

---

## Advanced Configuration

### Switch to Different AI Provider

Want to use OpenAI, Anthropic, or another provider? Here's how:

#### Option 1: Use OpenAI

**In `lib/ai/providers.ts`:**

```typescript
import { createOpenAI } from '@ai-sdk/openai';

const provider = createOpenAI({
  baseURL: 'https://gateway.ai.anthropic.com/v1',
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

// Update models
export const chat = provider('gpt-4-turbo-preview');
export const reasoning = provider('gpt-4-turbo-preview');
export const title = provider('gpt-3.5-turbo');
export const artifact = provider('gpt-4-turbo-preview');
```

**Add to `.env.local`:**
```env
OPENAI_API_KEY=sk-...
```

#### Option 2: Use Anthropic Claude

**In `lib/ai/providers.ts`:**

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

const provider = createAnthropic({
  baseURL: 'https://gateway.ai.anthropic.com/v1',
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

// Update models
export const chat = provider('claude-3-5-sonnet-20241022');
export const reasoning = provider('claude-3-5-sonnet-20241022');
export const title = provider('claude-3-haiku-20240307');
export const artifact = provider('claude-3-5-sonnet-20241022');
```

**Add to `.env.local`:**
```env
ANTHROPIC_API_KEY=sk-ant-...
```

### Enable Redis for Resumable Streams

Resumable streams allow users to reconnect and continue receiving responses if connection drops.

**Step 1:** Set up Redis (use Vercel KV or Upstash)

**Step 2:** Add to `.env.local`:
```env
REDIS_URL=redis://...
```

**Step 3:** The project automatically detects `REDIS_URL` and enables resumable streams in `app/(chat)/api/chat/route.ts`

### Add Custom Tools

Tools allow the AI to call functions (like getting weather, creating documents).

**Step 1:** Create tool file `lib/ai/tools/my-tool.ts`:

```typescript
import { z } from 'zod';
import { tool } from 'ai';

export const myCustomTool = tool({
  description: 'Does something useful',
  parameters: z.object({
    input: z.string().describe('The input parameter'),
  }),
  execute: async ({ input }) => {
    // Your tool logic here
    const result = await doSomething(input);
    return { result };
  },
});
```

**Step 2:** Register in `app/(chat)/api/chat/route.ts`:

```typescript
import { myCustomTool } from '@/lib/ai/tools/my-tool';

const result = streamText({
  model: selectedModel,
  messages,
  system: systemPrompt,
  maxSteps: 5,
  tools: {
    getWeather,
    createDocument,
    updateDocument,
    requestSuggestions,
    myCustomTool,  // Add your tool
  },
  experimental_activeTools: tools,
});
```

**Step 3:** Update system prompt in `lib/ai/prompts.ts` to tell AI about the new tool.

---

## Testing Your Changes

After making changes, always test:

### Run Linter
```bash
pnpm lint
```

### Run Tests
```bash
pnpm test
```

### Manual Testing Checklist

- [ ] Start dev server (`pnpm dev`)
- [ ] Sign in as guest
- [ ] Send basic message
- [ ] Test weather tool
- [ ] Create an artifact
- [ ] Check browser console for errors
- [ ] Check terminal for errors
- [ ] Verify rate limits work
- [ ] Test with different user types

---

## Summary

You now know how to:

✅ Verify Vercel AI Gateway is implemented
✅ Configure environment variables
✅ Understand provider configuration
✅ Test gateway functionality
✅ Monitor usage and costs
✅ Customize rate limits and models
✅ Troubleshoot common issues
✅ Add advanced features

## Next Steps

- Read the [Vercel AI SDK documentation](https://sdk.vercel.ai/docs)
- Explore [xAI Grok API docs](https://docs.x.ai/docs)
- Check out the project's `CLAUDE.md` for more details
- Experiment with different models and settings

## Getting Help

- Project issues: Check `CLAUDE.md` in project root
- Vercel AI Gateway: [Vercel documentation](https://vercel.com/docs/ai-gateway)
- Community: Vercel Discord or GitHub Discussions

---

**Happy coding! 🚀**
