# AGENTS.md

共通ルールは `COMMON-AGENTS.md` を必ず確認し、上位方針として扱う。
このファイルでは `local-translate-ai` 固有の補足だけを記載する。

## Project

Local Translate AI is a Firefox WebExtension built with TypeScript, React, Vite, and Bun.

## Commands

Configured checks for this repository:

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
