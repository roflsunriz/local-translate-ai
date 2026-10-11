# 検証手順

## TypeScript 7 への更新（2026-10-11）

Dependabot PR #23 の TypeScript 7 単独更新では `typescript-eslint` がコンパイラー API を読み込めず、CI の lint が失敗した。TypeScript 公式の併用構成に従い、`typescript` を TypeScript 6 の互換 API、`@typescript/native` を TypeScript 7 の `tsc` に割り当てた。`bunx tsc --version` で 7.0.2 を確認する。

依存更新後に `bun install --frozen-lockfile`、`bun run lint`、`bun run type-check`、`bun run build`、`bun run test`（4 ファイル、23 件）、`bun run amo:validate`、`bun run amo:lint` が成功した。`amo:lint` には生成済み JS の `innerHTML` に関する警告が 2 件残る。`bun outdated` の残件は ESLint 10 だが、現行 `eslint-plugin-react` の peer dependency が ESLint 9 までなので更新していない。

`bun audit` は 23 件から 1 件に減った。残件は開発依存 `web-ext > @devicefarmer/adbkit > node-forge@1.4.0` の [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)（high）。2026-10-11 時点で修正版は未公開であり、`bun audit fix` でも解消できない。修正版が公開されたら更新して再監査する。

## Dependabot 自動処理（2026-09-23）

`.github/workflows/dependabot-automation.yml` を actionlint で検査し、PR 用 workflow 名（CI）と一致することを確認する。Dependabot の patch／minor かつ全 PR チェック成功の場合だけ取り込み、major・古い SHA・限定修復後も失敗した PR は残す。

実際の Dependabot PR がまだない場合、動作経路は未検証として扱う。実 PR 発生後に自動化ジョブ、CI の再試行、マージ結果を確認する。

大量の Dependabot PR により CI 完了より分類が遅れる場合でも、分類後の `workflow_dispatch` が現在の PR 番号と head SHA を照合して再評価する。別の作成者、古い SHA、未完了の CI はマージしない。

## Dependabot PR 手動処理実績（2026-09-23）

開放中の major 7 件（#5、#7、#9、#10、#11、#12、#13）を手動で処理した。#7 と GitHub Actions 系 5 件は CI 全通過のため即時 squash merge した。#5 は `Check (build)` が `vite/internal` 未提供で失敗したため、原因を特定して Vite 7→8 へ同時更新し、PR ブランチ上で `bun run lint`、`type-check`、`build`、`test`（23 件）、`amo:validate` と `bun audit`（脆弱性なし）を確認してから squash merge した。マージ後に `git fetch --prune` で不要なリモートブランチが残っていないことを確認した。

## 2026-10-05: GitHub受付・READMEの整備（公開前）

- 比較元: `33b611d9370dc00394c804a785791429a9efde0b`（`main`）。
- 受付フォーム 2 件のYAML構造、重複キー・ID、入力型、選択肢、予約ファイル名を一括検査し、エラー0件。
- 既存の固有質問・入力例・必須条件を原文と照合。READMEのリンク・画像・コマンド・条件を確認し、裏付けがある誤記だけを訂正した。
- 既存のCI、Dependabot、labeler、ライセンスのファイル内容は比較元から変更していない。
- 製品のビルド・インストール・実機操作、GitHub上のフォーム表示、公開後CIは今回の静的検証に含めない。公開後に実際の受付表示と必要ラベルの適用を確認する。
- 公開前に確認する不足ラベル: `needs triage`。既存ラベルの削除・上書きはしない。
