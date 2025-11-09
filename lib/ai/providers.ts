import { createGateway } from "@ai-sdk/gateway";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";
import { chatModels } from "./models";

const vercelGateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: process.env.AI_GATEWAY_URL,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const { createMockLanguageModel } = require("./models.mock");

      const chatLanguageModels = Object.fromEntries(
        chatModels.map(({ id }) => [id, createMockLanguageModel()])
      );

      return customProvider({
        languageModels: {
          ...chatLanguageModels,
        },
      });
    })()
  : customProvider({
      languageModels: {
        ...Object.fromEntries(
          chatModels.map(({ id, vercelId, isReasoning }) => {
            const model = vercelGateway.languageModel(vercelId);

            if (!isReasoning) {
              return [id, model];
            }

            return [
              id,
              wrapLanguageModel({
                model,
                middleware: extractReasoningMiddleware({ tagName: "think" }),
              }),
            ];
          })
        ),
      },
    });

export function getModel(modelId: string) {
  return myProvider.languageModel(modelId);
}
