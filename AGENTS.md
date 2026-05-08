# Repository Instructions

## Project

Local Translate AI is a Firefox WebExtension built with TypeScript, React, Vite, and bun.

## Commands

Run these checks before handing off code changes:

```sh
bun run lint
bun run type-check
bun run build
```

## Notes

- Keep changes scoped to the requested behavior.
- Prefer existing services, stores, and message types over new abstractions.
- Do not revert user changes in the working tree.
- Use `bun` for package scripts and dependency operations.
