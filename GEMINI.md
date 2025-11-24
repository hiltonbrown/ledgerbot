# GEMINI.md: AI-Powered Accounting Workspace (LedgerBot)

This document provides a comprehensive overview of the LedgerBot project, an AI-powered accounting workspace built for Australian businesses. It's intended to be used as a context file for interacting with the Gemini CLI.

## Project Overview

LedgerBot is a Next.js 15 application that leverages the Vercel AI SDK to provide a suite of AI-powered tools for accountants and bookkeepers. It integrates with Xero to automate bookkeeping tasks, ensure GST/BAS compliance, and provide instant answers to tax questions.

### Key Technologies

*   **Framework:** Next.js 15 (with App Router and Partial Prerendering)
*   **Language:** TypeScript
*   **Database:** PostgreSQL with Drizzle ORM
*   **AI:** Vercel AI SDK with support for multiple models (Claude, GPT, Gemini)
*   **Authentication:** Clerk
*   **Styling:** Tailwind CSS
*   **Testing:** Playwright for end-to-end testing
*   **Linting:** Biome (via Ultracite)

### Architecture

The application follows a modern, server-first architecture with Next.js Server Components and Server Actions. The frontend is built with React 19 and Tailwind CSS. The backend consists of Next.js Route Handlers that interact with the Vercel AI SDK, Xero API, and the PostgreSQL database.

## Building and Running

### Prerequisites

*   Node.js (v18+)
*   pnpm
*   Docker (for running a local PostgreSQL database)

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/hiltonbrown/ledgerbot.git
    cd ledgerbot
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Configure environment variables:**
    *   Copy `.env.example` to `.env.local`.
    *   Fill in the required environment variables, including your database connection string, Clerk keys, and AI Gateway API key.

4.  **Set up the database:**
    *   Start a PostgreSQL database using Docker.
    *   Run the database migrations:
        ```bash
        pnpm db:migrate
        ```

5.  **Run the development server:**
    ```bash
    pnpm dev
    ```
    The application will be available at `http://localhost:3000`.

### Key Commands

*   `pnpm dev`: Starts the development server.
*   `pnpm build`: Builds the application for production.
*   `pnpm start`: Starts the production server.
*   `pnpm lint`: Lints the codebase.
*   `pnpm format`: Formats the codebase.
*   `pnpm test`: Runs the end-to-end tests with Playwright.
*   `pnpm db:migrate`: Applies database migrations.
*   `pnpm db:generate`: Generates new database migrations.
*   `pnpm db:studio`: Opens the Drizzle Studio to view and manage your database.

## Development Conventions

### Code Style

*   The project uses Biome (via Ultracite) for linting and formatting. Run `pnpm format` before committing to ensure your code adheres to the project's style guidelines.
*   Follow the code standards outlined in the `README.md` file, such as using `const` by default, using type-safe imports and exports, and avoiding the `any` type.

### Testing

*   End-to-end tests are written with Playwright and can be run with `pnpm test`.
*   When adding new features, it's recommended to add corresponding tests to ensure the new functionality is working correctly and doesn't introduce any regressions.

### Commits

*   Commit messages should follow the Conventional Commits specification. This helps to maintain a clear and consistent commit history.

### Database

*   Database schema changes are managed with Drizzle Kit.
*   To make changes to the schema, modify the files in `lib/db/schema.ts`, generate a new migration with `pnpm db:generate`, and then apply the migration with `pnpm db:migrate`.
