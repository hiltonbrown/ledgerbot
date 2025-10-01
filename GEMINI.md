# GEMINI.md

Guidance for Google's Gemini when contributing to this repository.

## Engineering Practices
⚠️ Preserve integrity of external dependencies.
Do not alter files inside node_modules or any installed packages. Instead, use wrappers, patching tools, or configuration hooks. This practice supports clean upgrades, auditability, and prevents regressions when dependencies are updated.
