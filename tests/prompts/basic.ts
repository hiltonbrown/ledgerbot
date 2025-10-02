import type { ModelMessage } from "ai";

export const TEST_PROMPTS: Record<string, ModelMessage> = {
  USER_SKY: {
    role: "user",
    content: [{ type: "text", text: "Why is the sky blue?" }],
  },
  USER_GRASS: {
    role: "user",
    content: [{ type: "text", text: "Why is grass green?" }],
  },
  USER_THANKS: {
    role: "user",
    content: [{ type: "text", text: "Thanks!" }],
  },
  USER_NEXTJS: {
    role: "user",
    content: [
      { type: "text", text: "What are the advantages of using Next.js?" },
    ],
  },
  USER_IMAGE_ATTACHMENT: {
    role: "user",
    content: [
      {
        type: "file",
        mediaType: "...",
        data: "...",
      },
      {
        type: "text",
        text: "Who painted this?",
      },
    ],
  },
  USER_TEXT_ARTIFACT: {
    role: "user",
    content: [
      {
        type: "text",
        text: "Help me write an essay about Silicon Valley",
      },
    ],
  },
  CREATE_DOCUMENT_TEXT_CALL: {
    role: "user",
    content: [
      {
        type: "text",
        text: "Essay about Silicon Valley",
      },
    ],
  },
  CREATE_DOCUMENT_TEXT_RESULT: {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: "call_123",
        toolName: "createDocument",
        output: {
          type: "json",
          value: {
            id: "3ca386a4-40c6-4630-8ed1-84cbd46cc7eb",
            title: "Essay about Silicon Valley",
            kind: "text",
            content: "A document was created and is now visible to the user.",
          },
        },
      },
    ],
  },
  GET_WEATHER_CALL: {
    role: "user",
    content: [
      {
        type: "text",
        text: "What's the weather in Brisbane?",
      },
    ],
  },
  GET_WEATHER_RESULT: {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: "call_456",
        toolName: "getWeather",
        output: {
          type: "json",
          value: {
            latitude: -27.4698,
            longitude: 153.0251,
            generationtime_ms: 0.064_492_225_646_972_66,
            utc_offset_seconds: 36_000,
            timezone: "Australia/Brisbane",
            timezone_abbreviation: "AEST",
            elevation: 18,
            current_units: {
              time: "iso8601",
              interval: "seconds",
              temperature_2m: "°C",
            },
            current: {
              time: "2025-03-10T14:00",
              interval: 900,
              temperature_2m: 24,
            },
            daily_units: {
              time: "iso8601",
              sunrise: "iso8601",
              sunset: "iso8601",
            },
            daily: {
              time: [
                "2025-03-10",
                "2025-03-11",
                "2025-03-12",
                "2025-03-13",
                "2025-03-14",
                "2025-03-15",
                "2025-03-16",
              ],
              sunrise: [
                "2025-03-10T05:51",
                "2025-03-11T05:52",
                "2025-03-12T05:53",
                "2025-03-13T05:54",
                "2025-03-14T05:55",
                "2025-03-15T05:55",
                "2025-03-16T05:56",
              ],
              sunset: [
                "2025-03-10T17:54",
                "2025-03-11T17:53",
                "2025-03-12T17:52",
                "2025-03-13T17:51",
                "2025-03-14T17:50",
                "2025-03-15T17:49",
                "2025-03-16T17:48",
              ],
            },
          },
        },
      },
    ],
  },
};
