/**
 * Tests for artifact duplication prevention
 * 
 * These tests verify that the AI correctly uses updateDocument instead of
 * createDocument when users request modifications to existing content.
 */

import { expect } from "@playwright/test";

type TestScenario = {
  name: string;
  messages: Array<{ role: string; content: string }>;
  expectedToolCall: {
    toolName: string;
    args: any;
  };
  followUp?: {
    message: string;
    expectedToolCall: {
      toolName: string;
      args: any;
    };
  };
};

/**
 * Test scenario: User creates a document, then requests modifications
 * Expected: AI should use updateDocument, not createDocument
 */
export const modificationScenarios: TestScenario[] = [
  {
    name: "User asks to change document content",
    messages: [
      {
        role: "user",
        content: "Write an essay about artificial intelligence",
      },
    ],
    expectedToolCall: {
      toolName: "createDocument",
      args: {
        title: expect.stringContaining("Artificial Intelligence"),
        kind: "text",
      },
    },
    followUp: {
      message: "Change it to be about machine learning instead",
      expectedToolCall: {
        toolName: "updateDocument",
        args: {
          id: expect.any(String), // Should use the ID from the first document
          description: expect.stringContaining("machine learning"),
        },
      },
    },
  },
  {
    name: "User asks to improve existing document",
    messages: [
      {
        role: "user",
        content: "Create a document about quantum computing",
      },
    ],
    expectedToolCall: {
      toolName: "createDocument",
      args: {
        title: expect.stringContaining("Quantum Computing"),
        kind: "text",
      },
    },
    followUp: {
      message: "Make it more technical and detailed",
      expectedToolCall: {
        toolName: "updateDocument",
        args: {
          id: expect.any(String),
          description: expect.stringContaining("technical"),
        },
      },
    },
  },
  {
    name: "User asks to add content to document",
    messages: [
      {
        role: "user",
        content: "Write a summary of blockchain technology",
      },
    ],
    expectedToolCall: {
      toolName: "createDocument",
      args: {
        title: expect.stringContaining("Blockchain"),
        kind: "text",
      },
    },
    followUp: {
      message: "Add a section about cryptocurrencies",
      expectedToolCall: {
        toolName: "updateDocument",
        args: {
          id: expect.any(String),
          description: expect.stringContaining("cryptocurrencies"),
        },
      },
    },
  },
  {
    name: "User asks to fix document issues",
    messages: [
      {
        role: "user",
        content: "Create a document explaining neural networks",
      },
    ],
    expectedToolCall: {
      toolName: "createDocument",
      args: {
        title: expect.stringContaining("Neural Networks"),
        kind: "text",
      },
    },
    followUp: {
      message: "Fix the grammar and make it clearer",
      expectedToolCall: {
        toolName: "updateDocument",
        args: {
          id: expect.any(String),
          description: expect.stringContaining("grammar"),
        },
      },
    },
  },
  {
    name: "User refers to 'it' or 'the document'",
    messages: [
      {
        role: "user",
        content: "Write about renewable energy",
      },
    ],
    expectedToolCall: {
      toolName: "createDocument",
      args: {
        title: expect.stringContaining("Renewable Energy"),
        kind: "text",
      },
    },
    followUp: {
      message: "Make it shorter and more concise",
      expectedToolCall: {
        toolName: "updateDocument",
        args: {
          id: expect.any(String),
          description: expect.stringContaining("shorter"),
        },
      },
    },
  },
];

/**
 * Test scenario: User explicitly requests a NEW document
 * Expected: AI should use createDocument
 */
export const newDocumentScenarios: TestScenario[] = [
  {
    name: "User explicitly asks for new document on different topic",
    messages: [
      {
        role: "user",
        content: "Write an essay about AI",
      },
    ],
    expectedToolCall: {
      toolName: "createDocument",
      args: {
        title: expect.stringContaining("AI"),
        kind: "text",
      },
    },
    followUp: {
      message: "Now create a separate document about blockchain",
      expectedToolCall: {
        toolName: "createDocument",
        args: {
          title: expect.stringContaining("Blockchain"),
          kind: "text",
        },
      },
    },
  },
  {
    name: "User asks for new document with 'new' keyword",
    messages: [
      {
        role: "user",
        content: "Create a document about Python programming",
      },
    ],
    expectedToolCall: {
      toolName: "createDocument",
      args: {
        title: expect.stringContaining("Python"),
        kind: "text",
      },
    },
    followUp: {
      message: "Create a new document about JavaScript",
      expectedToolCall: {
        toolName: "createDocument",
        args: {
          title: expect.stringContaining("JavaScript"),
          kind: "text",
        },
      },
    },
  },
];

/**
 * Test scenario: Edge cases
 */
export const edgeCaseScenarios: TestScenario[] = [
  {
    name: "User creates document, thanks AI, then asks for changes",
    messages: [
      {
        role: "user",
        content: "Write about climate change",
      },
    ],
    expectedToolCall: {
      toolName: "createDocument",
      args: {
        title: expect.stringContaining("Climate Change"),
        kind: "text",
      },
    },
    followUp: {
      message: "Thanks! Can you make it more detailed?",
      expectedToolCall: {
        toolName: "updateDocument",
        args: {
          id: expect.any(String),
          description: expect.stringContaining("detailed"),
        },
      },
    },
  },
  {
    name: "User asks for similar but distinct content",
    messages: [
      {
        role: "user",
        content: "Write about solar panels",
      },
    ],
    expectedToolCall: {
      toolName: "createDocument",
      args: {
        title: expect.stringContaining("Solar"),
        kind: "text",
      },
    },
    followUp: {
      message: "Now write about wind turbines as a separate document",
      expectedToolCall: {
        toolName: "createDocument",
        args: {
          title: expect.stringContaining("Wind"),
          kind: "text",
        },
      },
    },
  },
];

/**
 * Expected behavior summary for documentation:
 * 
 * UPDATE (use updateDocument) when user says:
 * - "Change it to..."
 * - "Make it..."
 * - "Update it..."
 * - "Fix..."
 * - "Improve..."
 * - "Add..."
 * - "Remove..."
 * - "Revise..."
 * - "Modify..."
 * - References "it", "the document", "this"
 * 
 * CREATE (use createDocument) when user says:
 * - "Create a new document..."
 * - "Write a separate document..."
 * - Asks for completely different topic
 * - Uses "new", "another", "separate"
 * - First document in conversation
 */
