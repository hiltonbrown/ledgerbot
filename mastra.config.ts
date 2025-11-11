import { Mastra } from "@mastra/core";
import { mastra as ledgerbotMastra } from "@/lib/mastra";

/**
 * Mastra Studio Configuration
 *
 * This file extends the main LedgerBot Mastra instance with
 * Studio-specific server settings for local development.
 *
 * Usage:
 * - Run `pnpm studio` to start the development server
 * - Access Studio UI at http://localhost:4111
 * - View API docs at http://localhost:4111/swagger-ui
 *
 * Available agents: qanda, forecasting, analytics, workflow, ap, ar
 */
export const mastra = new Mastra({
  // Import all registered agents from the main LedgerBot instance
  agents: ledgerbotMastra.agents,

  // Studio server configuration
  server: {
    port: 4111, // Default Mastra Studio port
    host: "localhost", // Bind to localhost for local development
  },
});

/**
 * Uncomment below to enable HTTPS for local development
 *
 * Requirements:
 * 1. Generate certificates using mkcert or similar tool
 * 2. Place certs in project root
 * 3. Run `pnpm studio:https`
 */
// import fs from "node:fs";
//
// export const mastra = new Mastra({
//   agents: ledgerbotMastra.agents,
//   server: {
//     port: 4111,
//     host: "localhost",
//     https: {
//       key: fs.readFileSync("./localhost-key.pem"),
//       cert: fs.readFileSync("./localhost-cert.pem"),
//     },
//   },
// });
