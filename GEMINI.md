# GEMINI.md

Guidance for Google's Gemini when contributing to this repository.

## Engineering Practices

### Commit Messages
This repository follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. Please format your commit messages as follows:

```
type(scope): subject

body
```

- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, etc.
- **scope** (optional): A noun specifying the section of the codebase affected (e.g., `settings`, `api`, `ui`).
- **subject**: A short, imperative-tense description of the change.
- **body** (optional): A more detailed explanation of the changes.

Example:
```
feat(settings): add default model preference

Allows users to select a default AI model in their settings, which will be used for new chats.
```

### Code Formatting and Linting
The project uses `ultracite` and `biome` for code formatting and linting.

- To format your code, run: `pnpm format`
- To check for linting issues, run: `pnpm lint`

Please ensure your code is formatted and free of linting errors before submitting a pull request. Note that the linting configuration in `biome.jsonc` has some rules disabled for pragmatic reasons. While the linter is not overly strict, strive to write clean and maintainable code.

### Testing
This project uses [Playwright](https://playwright.dev/) for end-to-end testing.

- To run the entire test suite, use the command: `pnpm test`

When adding new features, please include corresponding tests.

### Database Migrations
The project uses `drizzle-orm` and `drizzle-kit` for database schema management.

- When you change the database schema, you must generate a new migration file. Use the following command: `pnpm db:generate`
- Migrations are applied automatically during the build process, as defined in the `build` script in `package.json`.

### Package Manager
This project uses `pnpm` as its package manager. Please use `pnpm` for all dependency management.

- To install dependencies: `pnpm install`
- To add a dependency: `pnpm add <package-name>`
- To remove a dependency: `pnpm remove <package-name>`

### External Dependencies
⚠️ Preserve integrity of external dependencies.
Do not alter files inside `node_modules` or any other installed packages. Instead, use wrappers, patching tools, or configuration hooks. This practice supports clean upgrades, auditability, and prevents regressions when dependencies are updated.