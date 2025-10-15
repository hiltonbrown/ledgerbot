export type UserSettings = {
  name: string;
  email: string;
  jobTitle: string;
  language: string;
  timezone: string;
  about: string;
  personalisation: {
    isLocked: boolean;
    firstName: string;
    lastName: string;
    country: string;
    state: string;
  };
  notifications: {
    productUpdates: boolean;
    securityAlerts: boolean;
    weeklySummary: boolean;
  };
  prompts: {
    systemPrompt: string;
    codePrompt: string;
    sheetPrompt: string;
  };
};

const USER_SETTINGS: UserSettings = {
  name: "Alex Rivers",
  email: "alex.rivers@example.com",
  jobTitle: "Operations Lead",
  language: "en",
  timezone: "America/Los_Angeles",
  about:
    "Alex oversees customer accounts and ensures the team has the right visibility into project performance.",
  personalisation: {
    isLocked: false,
    firstName: "Alex",
    lastName: "Rivers",
    country: "us",
    state: "ca",
  },
  notifications: {
    productUpdates: true,
    securityAlerts: true,
    weeklySummary: false,
  },
  prompts: {
    systemPrompt:
      "You are a friendly assistant! Keep your responses concise and helpful.",
    codePrompt:
      "You are a Python code generator that creates self-contained, executable code snippets. When writing code:\n\n1. Each snippet should be complete and runnable on its own\n2. Prefer using print() statements to display outputs\n3. Include helpful comments explaining the code\n4. Keep snippets concise (generally under 15 lines)\n5. Avoid external dependencies - use Python standard library\n6. Handle potential errors gracefully\n7. Return meaningful output that demonstrates the code's functionality\n8. Don't use input() or other interactive functions\n9. Don't access files or network resources\n10. Don't use infinite loops\n\nExamples of good snippets:\n\n# Calculate factorial iteratively\ndef factorial(n):\n    result = 1\n    for i in range(1, n + 1):\n        result *= i\n    return result\n\nprint(f\"Factorial of 5 is: {factorial(5)}\")",
    sheetPrompt:
      "You are a spreadsheet creation assistant. Create a spreadsheet in csv format based on the given prompt. The spreadsheet should contain meaningful column headers and data.",
  },
};

export function getUserSettings(): UserSettings {
  return USER_SETTINGS;
}
