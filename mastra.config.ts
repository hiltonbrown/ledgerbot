import { Mastra } from "@mastra/core";
import { qandaAgent } from "@/lib/agents/qanda/agent";
import { forecastingAgent } from "@/lib/agents/forecasting/agent";
import { analyticsAgent } from "@/lib/agents/analytics/agent";
import { workflowSupervisorAgent } from "@/lib/agents/workflow/supervisor";
import { apAgent } from "@/lib/agents/ap/agent";
import { arAgent } from "@/lib/agents/ar/agent";

/**
 * Mastra Studio Configuration
 *
 * This file imports all LedgerBot agents and configures the Studio
 * development server for local testing and debugging.
 *
 * Usage:
 * - Run `pnpm studio` to start the development server
 * - Access Studio UI at http://localhost:4111
 * - View API docs at http://localhost:4111/swagger-ui
 *
 * Available agents: qanda, forecasting, analytics, workflow, ap, ar
 */
export const mastra = new Mastra({
  // Register all LedgerBot agents (same as lib/mastra/index.ts)
  agents: {
    qanda: qandaAgent,
    forecasting: forecastingAgent,
    analytics: analyticsAgent,
    workflow: workflowSupervisorAgent,
    ap: apAgent,
    ar: arAgent,
  },

  // Studio server configuration
  server: {
    port: 4111, // Default Mastra Studio port
    host: "localhost", // Bind to localhost for local development
  },
});

/**
 * HTTPS Configuration (Optional)
 *
 * To enable HTTPS for local development:
 * 1. Generate certificates using mkcert:
 *    - Install mkcert: https://github.com/FiloSottile/mkcert
 *    - Run: mkcert -install
 *    - Run: mkcert localhost 127.0.0.1 ::1
 * 2. Uncomment the HTTPS configuration below
 * 3. Update certificate paths if needed
 * 4. Run: pnpm studio:https
 *
 * Example with HTTPS enabled:
 *
 * import fs from "node:fs";
 *
 * export const mastra = new Mastra({
 *   agents: {
 *     qanda: qandaAgent,
 *     forecasting: forecastingAgent,
 *     analytics: analyticsAgent,
 *     workflow: workflowSupervisorAgent,
 *     ap: apAgent,
 *     ar: arAgent,
 *   },
 *   server: {
 *     port: 4111,
 *     host: "localhost",
 *     https: {
 *       key: fs.readFileSync("./localhost+2-key.pem"),
 *       cert: fs.readFileSync("./localhost+2.pem"),
 *     },
 *   },
 * });
 */
