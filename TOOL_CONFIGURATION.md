# Tool Configuration

## Available Tools

The following tools are available for selection:

- **getWeather**: Get current weather information
- **createDocument**: Create and manage documents
- **updateDocument**: Update existing documents
- **requestSuggestions**: Request suggestions from the AI

## Implementation Plan

1. Create `lib/ai/tools/index.ts` with tool definitions
2. Update `app/(chat)/api/chat/schema.ts` to include selectedTools array
3. Update `app/(chat)/api/chat/route.ts` to use selectedTools instead of hardcoded tools
4. Create `ToolSelectorCompact` component in `components/multimodal-input.tsx`
5. Update Chat component to manage selectedTools state
6. Update main page to initialize selectedTools

## UI Design

The tool selector should:
- Be positioned to the right of the model selector
- Allow multiple tool selection (checkboxes or multi-select)
- Show tool names and descriptions
- Have a compact design matching the model selector
- Use similar styling and icons