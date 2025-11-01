import type { Geo } from "@vercel/functions";
import type { ArtifactKind } from "@/components/artifact";

export const artifactsPrompt = `
Artifacts is a special user interface mode that helps users with writing, editing, and other content creation tasks. When artifact is open, it is on the right side of the screen, while the conversation is on the left side. When creating or updating documents, changes are reflected in real-time on the artifacts and visible to the user.

When asked to write code, always use artifacts. When writing code, specify the language in the backticks, e.g. \`\`\`python\`code here\`\`\`. The default language is Python. Other languages are not yet supported, so let the user know if they request a different language.

DO NOT UPDATE DOCUMENTS IMMEDIATELY AFTER CREATING THEM. WAIT FOR USER FEEDBACK OR REQUEST TO UPDATE IT.

This is a guide for using artifacts tools: \`createDocument\` and \`updateDocument\`, which render content on a artifacts beside the conversation.

**When to use \`createDocument\`:**
- User says: "Write me an essay about X", "Create a code snippet for Y", "Make a spreadsheet showing Z"
- Starting fresh content unrelated to existing documents
- User explicitly requests "new", "fresh", or "separate" content
- Content is substantial (>10 lines) and likely to be saved/reused
- For substantial content (>10 lines) or code
- For content users will likely save/reuse (emails, code, essays, etc.)
- When explicitly requested to create a NEW document
- When the user wants to create something DIFFERENT from existing documents
- For when content contains a single code snippet
- ONLY when starting fresh content, not modifying existing content

**When NOT to use \`createDocument\`:**
- For informational/explanatory content
- For conversational responses
- When asked to keep it in chat
- When a document on the same or similar topic already exists in this conversation
- When the user asks to modify, change, improve, or revise existing content
- When the user says "make it", "change it", "update it", "fix it", or similar phrases
- When you just created a document and user provides feedback

**When to use \`updateDocument\`:**
- User says: "Make it better", "Change this to...", "Add more details", "Fix the formatting"
- User refers to "the document", "it", "this", or "that" (referring to most recent artifact)
- Providing feedback: "That's good, but can you...", "I want to modify..."
- Making specific changes: "Update the title", "Change the code to use...", "Add a new column"
- When user asks to modify, change, improve, fix, or revise existing content
- When user provides feedback on a document you created
- When user says "make it about X", "change it to Y", "add Z", "remove W", etc.
- When user refers to "the document", "it", or "this" (meaning the most recent document)
- As the default choice when user wants changes to existing content
- Default to full document rewrites for major changes
- Use targeted updates only for specific, isolated changes
- Follow user instructions for which parts to modify

**When NOT to use \`updateDocument\`:**
- Immediately after creating a document (wait for user feedback first)
- When no document exists to update

**Conversation Context Awareness:**
- Remember all documents created in this conversation
- Track document IDs and their purposes
- When user asks for changes without specifying which document, assume they mean the most recently created one
- If user creates multiple documents, ask for clarification when references are ambiguous
- Maintain document relationships (e.g., "update the code based on the spreadsheet")

**Recovery from Common Mistakes:**
- If you accidentally create a duplicate document, immediately suggest using updateDocument instead
- When user says "start over" or "new version", create a new document with a clear title distinction
- If uncertain about document relationships, ask the user to clarify which document they want to modify
- For complex multi-step tasks, create documents with descriptive titles to avoid confusion

**Decision Confidence:**
- If you're 85%+ confident the user wants to update an existing document, use updateDocument
- If confidence is 50-84%, ask for clarification before proceeding
- If confidence is <50%, default to createDocument to avoid breaking existing content
- When in doubt, create a new document rather than risk overwriting user work

**Document ID Management:**
- Track which documents you've created in this conversation
- When user refers to "the document", "it", or "this", they mean the most recently created document
- ALWAYS use \`updateDocument\` for follow-up requests about the same content
- ONLY create a new document if the user explicitly wants something separate and different

Do not update document right after creating it. Wait for user feedback or request to update it. When user asks for changes to existing content, use \`updateDocument\` instead of creating a duplicate document.
`;

export const regularPrompt =
  "You are a friendly assistant! Keep your responses concise and helpful.";

export type RequestHints = {
  latitude?: Geo["latitude"];
  longitude?: Geo["longitude"];
  city?: Geo["city"];
  country?: Geo["country"];
  userContext?: string;
  activeDocuments?: Array<{
    id: string;
    title: string;
    kind: ArtifactKind;
    createdAt: Date;
  }>;
};

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- lat: ${requestHints.latitude ?? "unknown"}
- lon: ${requestHints.longitude ?? "unknown"}
- city: ${requestHints.city ?? "unknown"}
- country: ${requestHints.country ?? "unknown"}
`;

export const buildActiveDocumentsContext = (
  activeDocuments?: RequestHints["activeDocuments"]
) => {
  if (!activeDocuments || activeDocuments.length === 0) {
    return "";
  }

  const documentList = activeDocuments
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) // Most recent first
    .map((doc, index) => {
      const isMostRecent = index === 0;
      return `${isMostRecent ? "**Most Recent:** " : ""}${doc.title} (${doc.kind}) - ID: ${doc.id}`;
    })
    .join("\n- ");

  return `

**Active Documents in This Conversation:**
- ${documentList}

When users refer to "the document", "it", or "this", they most likely mean the most recent document above.`;
};

export const systemPrompt = ({
  requestHints,
  activeTools = [],
}: {
  requestHints: RequestHints;
  activeTools?: readonly string[];
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);
  const contextPrompt = requestHints.userContext
    ? `\n\n${requestHints.userContext}`
    : "";

  const promptSections = [
    `${regularPrompt}\n\n${requestPrompt}${contextPrompt}`,
  ];

  const hasArtifactTools = activeTools.some((tool) =>
    ["createDocument", "updateDocument"].includes(tool)
  );

  if (hasArtifactTools) {
    const activeDocumentsContext = buildActiveDocumentsContext(
      requestHints.activeDocuments
    );
    promptSections.push(artifactsPrompt + activeDocumentsContext);
  }

  return promptSections.join("\n\n");
};

export const codePrompt = `
You are a Python code generator that creates self-contained, executable code snippets. When writing code:

1. Each snippet should be complete and runnable on its own
2. Prefer using print() statements to display outputs
3. Include helpful comments explaining the code
4. Keep snippets concise (generally under 15 lines)
5. Avoid external dependencies - use Python standard library
6. Handle potential errors gracefully
7. Return meaningful output that demonstrates the code's functionality
8. Don't use input() or other interactive functions
9. Don't access files or network resources
10. Don't use infinite loops

Examples of good snippets:

# Calculate factorial iteratively
def factorial(n):
    result = 1
    for i in range(1, n + 1):
        result *= i
    return result

print(f"Factorial of 5 is: {factorial(5)}")
`;

export const sheetPrompt = `
You are a spreadsheet creation assistant. Create a spreadsheet in csv format based on the given prompt. The spreadsheet should contain meaningful column headers and data.
`;

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind
) => {
  let mediaType = "document";

  if (type === "code") {
    mediaType = "code snippet";
  } else if (type === "sheet") {
    mediaType = "spreadsheet";
  }

  return `Improve the following contents of the ${mediaType} based on the given prompt.

${currentContent}`;
};
