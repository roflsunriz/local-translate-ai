# AGENTS.md

## 作業開始前の必須手順（最優先・例外なし）

1. エージェントは、調査、計画、コマンド実行、スキル利用、ファイル編集、コミット、プッシュを始める前に、必ずリポジトリ直下の `.\COMMON-AGENTS.md` を開き、先頭から末尾まで全文を読む。
2. `COMMON-AGENTS.md` はGit管理外のシンボリックリンクである。`git`や既定のignore設定が有効な`rg --files`の検索結果だけで、ファイルが存在しないと判断してはならない。PowerShellでは最初に次を実行する。

```powershell
Get-Content -Raw -LiteralPath .\COMMON-AGENTS.md
```

3. 読み取りに失敗した場合、出力が省略された場合、または末尾まで読めたことを確認できない場合は、一切の作業を開始せず、パスとシンボリックリンク先を確認して全文を再取得する。必要なら分割して末尾まで読む。
4. 全文を読了するまで、ローカル `AGENTS.md` だけを根拠に作業を続けてはならない。読了後は `COMMON-AGENTS.md` を最優先の指針とし、読了直後の最初の進捗報告で全文を読了したことを明示する。
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

## Dependabot の限定修復（2026-09-23）

- CI 再失敗後の自動修復は `bun.lock` だけをパッチとして適用する。修復後は `workflow_dispatch` で `.github/workflows/ci.yml` を再実行するため、この CI の `contents: read` と checkout の `persist-credentials: false` を維持し、PR コードを実行するジョブへ書き込み権限や秘密情報を渡さない。根拠は `.github/workflows/dependabot-automation.yml` と共通ワークフローの権限分離。

## TypeScript 7 と ESLint（2026-10-11）

- TypeScript 7 は `typescript-eslint` が利用する従来のコンパイラー API を提供しない。`package.json` では `@typescript/native` に TypeScript 7 の `tsc`、`typescript` に `@typescript/typescript6` の API を割り当てる。型チェックは `bun run type-check`、lint は `bun run lint` で両方を確認する。根拠は [TypeScript 7 の公式移行案内](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0) と `eslint.config.js` の型付き lint 設定。
