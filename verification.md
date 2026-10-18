# 検証手順

## 設定画面の白紙化修正とv1.9.1（2026-10-19）

- v1.9.0の`dist`をweb-ext 10.8.0から一時プロファイルのヘッドレスFirefox 158へ読み込み、`moz-extension://.../assets/global-*.js`の初期描画でReact error #130（要素型がobject）を再現した。生成JSを確認し、Vite 8のRolldownが`@mdi/react`の既定exportをmodule objectとして二重にラップしていたことを原因と特定した。
- 共通`MdiIcon`を`@mdi/js`のパスデータから標準`svg`／`path`要素を描画する実装へ変更し、`@mdi/react`を依存関係とlockfileから削除した。共通アイコンのSVG出力をVitestへ追加した。
- 修正後の`dist`を同じFirefox起動経路へ読み込み、v1.9.0で出ていたReact例外が発生しないことを確認した。`bun install --frozen-lockfile`、`bun run lint`、`bun run type-check`、`bun run test`（6ファイル、30件）、`bun run build`、`bun run audit`、`bun run test:node-forge`、`bun run amo:validate`、`bun run amo:lint`、`git diff --check`が成功した。AMO lintの既知のReact内部`innerHTML`警告は2件で増加していない。
- `bun outdated`で見つかったPostCSS 8.5.31を取り込み、更新後に残件がないことと全検査の再成功を確認した。`bun run zip:dist`で50エントリーのv1.9.1パッケージを生成し、`manifest.json`の版、設定画面、サイドバー、background scriptの同梱を確認した。

## ページ翻訳の同時リクエスト対応とv1.9.0（2026-10-19）

- llama.cpp、Ollama、LM Studio、LocalAI、vLLM、OpenAI API、OpenRouterの公式資料を確認した。OpenAI互換形式そのものは並列能力を保証せず、主要なローカルサーバーは1インスタンス内で複数リクエストを処理できるため、プロファイル単位の上限（1～32、既定値1）とした。根拠と適用条件は`docs/PAGE_TRANSLATION_CONCURRENCY.md`に記録した。
- Vitest 28件で、指定した並列数を超えないこと、結果の配列順を保持すること、並列完了順から元段落indexを識別できること、旧設定と不正なインポート値を1として扱うこと、過大なインポート値を32に制限すること、1件の失敗後も他のworkerが継続することを確認した。
- `bun install --frozen-lockfile`、`bun run lint`、`bun run type-check`、`bun run test`、`bun run build`、`bun run audit`、`bun run test:node-forge`、`bun run amo:validate`、`bun run amo:lint`が成功した。`bun outdated`に残件はない。AMO lintの既知の`innerHTML`警告2件は、今回の差分では増えていない。
- web-ext 10.8.0で一時プロファイルのヘッドレスFirefoxへ`dist`をtemporary add-onとして読み込めた。実モデルを使った速度比較とサーバーslotメトリクスの確認は、モデル／推論サーバーが起動していないため未実施。並列上限・順序・失敗時継続は自動テストで代替検証した。
- 公式actionlint v1.7.12のWindows amd64アセットを公式SHA-256一覧と照合して一時利用し、Bun 1.4.0への更新とCI／リリースmatrixへの`test`・`audit`追加を含む2 workflowをエラー0件で検査した。公開後のGitHub Actionsでも最終確認する。

## TypeScript 7 への更新（2026-10-11）

Dependabot PR #23 の TypeScript 7 単独更新では `typescript-eslint` がコンパイラー API を読み込めず、CI の lint が失敗した。TypeScript 公式の併用構成に従い、`typescript` を TypeScript 6 の互換 API、`@typescript/native` を TypeScript 7 の `tsc` に割り当てた。`bunx tsc --version` で 7.0.2 を確認する。

依存更新後に `bun install --frozen-lockfile`、`bun run lint`、`bun run type-check`、`bun run build`、`bun run test`（4 ファイル、23 件）、`bun run amo:validate`、`bun run amo:lint` が成功した。`amo:lint` には生成済み JS の `innerHTML` に関する警告が 2 件残る。`bun outdated` の残件は ESLint 10 だが、現行 `eslint-plugin-react` の peer dependency が ESLint 9 までなので更新していない。

`bun audit` は 23 件から 1 件に減った。残件は開発依存 `web-ext > @devicefarmer/adbkit > node-forge@1.4.0` の [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)（high）。2026-10-11 時点で修正版は未公開であり、`bun audit fix` でも解消できない。修正版が公開されたら更新して再監査する。

## Dependabot 自動処理（2026-09-23）

詳細は [findings.md](findings.md#verification-1) に移しました。

## Dependabot PR 手動処理実績（2026-09-23）

開放中の major 7 件（#5、#7、#9、#10、#11、#12、#13）を手動で処理した。#7 と GitHub Actions 系 5 件は CI 全通過のため即時 squash merge した。#5 は `Check (build)` が `vite/internal` 未提供で失敗したため、原因を特定して Vite 7→8 へ同時更新し、PR ブランチ上で `bun run lint`、`type-check`、`build`、`test`（23 件）、`amo:validate` と `bun audit`（脆弱性なし）を確認してから squash merge した。マージ後に `git fetch --prune` で不要なリモートブランチが残っていないことを確認した。

## 2026-10-05: GitHub受付・READMEの整備（公開前）

- 比較元: `33b611d9370dc00394c804a785791429a9efde0b`（`main`）。
- 受付フォーム 2 件のYAML構造、重複キー・ID、入力型、選択肢、予約ファイル名を一括検査し、エラー0件。
- 既存の固有質問・入力例・必須条件を原文と照合。READMEのリンク・画像・コマンド・条件を確認し、裏付けがある誤記だけを訂正した。
- 既存のCI、Dependabot、labeler、ライセンスのファイル内容は比較元から変更していない。
- 製品のビルド・インストール・実機操作、GitHub上のフォーム表示、公開後CIは今回の静的検証に含めない。公開後に実際の受付表示と必要ラベルの適用を確認する。
- 公開前に確認する不足ラベル: `needs triage`。既存ラベルの削除・上書きはしない。

## 2026-10-16: findings.mdへの知見分離

- 目的: 共通指針に合わせ、AGENTSの行動指示と利用者向けREADMEから、開発内部の実現手段・例外の条件・再利用する調査知見をfindings.mdへ分離した。移動した本文の条件・確認日・未検証の留保を保持した。
- 元文書との本文照合、Markdownの相対リンク・見出しアンカーの検査、git diff --checkを実施し、新たなリンク不整合と空白エラーは0件。AGENTSの一般的な指示は内容を保って再編し、findings全文必読・禁止と承認条件を確認した。
- GitHubの既存Dependabot警告を読み取り、Open PRも確認した（作業開始時Open PR 0件、Open警告 0件）。GitHubの警告なしを全依存の安全保証や実機動作の検証とは扱わない。
- ローカル監査はGHSA-86w9-cpqp-85rv（node-forge 1.4.0）を検出して失敗した。公式npmメタデータでnode-forge 1.4.0、adbkit 3.3.9、web-ext 10.8.0の依存経路を確認した。上流最新版も影響を受け、安全な公式修正版がないため、監査の抑制・無関係な降格・独自暗号パッチは加えていない。修正版公開後の再監査が必要。詳細はfindings.mdの再確認節を参照する。
- 文書移動と参照整理では製品の実行時ロジックを変更していない。実機書換え、認証操作、外部サービスへの投稿・署名・リリースは実施せず、これらの動作が再検証済みであるとは扱わない。

## 2026-10-16: node-forgeの既存パッチによる限定修復

- 初回のraw監査に残ったGHSA-86w9-cpqp-85rvへ、Ununiqueの既存パッチと構造回帰を再利用した。node-forge 1.4.0に不足していたDigestAlgorithmのASN.1要素数検査を追加し、パッチと実ファイル全体のSHA-256・版を監査時に照合する。
- Node回帰5件は、パッチ真正性と冪等性、正常パラメーターあり／省略の署名受理、余分なネスト要素の拒否、当該GHSAのみの判別、未知のGHSA・別依存・親の別警告を失敗させる負例が通過した。raw監査の警告本文は保持し、パッチを確認した対応済みの1件として明示する。既知脆弱性0件という表示には置き換えない。
- BunのpatchedDependenciesを登録し、bun install --frozen-lockfileで再現した。bun run auditとNode回帰5件、lint、型検査、Vitest23件、拡張buildが通過した。CIにaudit taskを追加した。AMO署名・公開や実利用プロファイルは操作していない。
