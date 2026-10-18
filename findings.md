# findings.md

local-translate-ai の実現手段、共通指針の適用条件と調査知見の正本。作業前に全文読む。利用者向けの導入・使用方法はREADME、更新の手順はhow-to-update.md、実施結果と未検証事項はverification.mdを参照する。移した記述の確認日・条件・留保は元のまま保持し、文書移動を再実測と解釈しない。

## 共通指針の適用条件と代替検証

- 対象の共通ルール: 設計と実装方針／検証／依存関係の変更
- 理由: Firefox拡張をBun・Viteで作り、TypeScript 7のtscとESLint用TypeScript 6 APIを併用する。
- 適用範囲: 型検査、lint、拡張ビルドとDependabotの限定修復
- 同等の品質を保つ手段・検証: package.jsonの型・lint・build・Vitestを確認する。修復jobの読み取り権限とlockfile限定適用を保ち、PRコードへ秘密や書き込み権限を渡さない。

新たな免除や操作許可を追加するものではない。AGENTS.mdの禁止・承認条件と共通指針は引き続き有効。

<a id="agents-1"></a>

## Project

Local Translate AI is a Firefox WebExtension built with TypeScript, React, Vite, and Bun.

移動元: `AGENTS.md`。

<a id="agents-2"></a>

## Commands

Configured checks for this repository:

```sh
bun run lint
bun run type-check
bun run build
```

移動元: `AGENTS.md`。

<a id="agents-3"></a>

## Notes

- Keep changes scoped to the requested behavior.
- Prefer existing services, stores, and message types over new abstractions.
- Do not revert user changes in the working tree.
- Use `bun` for package scripts and dependency operations.

移動元: `AGENTS.md`。

<a id="agents-4"></a>

## Dependabot の限定修復（2026-09-23）

- CI 再失敗後の自動修復は `bun.lock` だけをパッチとして適用する。修復後は `workflow_dispatch` で `.github/workflows/ci.yml` を再実行するため、この CI の `contents: read` と checkout の `persist-credentials: false` を維持し、PR コードを実行するジョブへ書き込み権限や秘密情報を渡さない。根拠は `.github/workflows/dependabot-automation.yml` と共通ワークフローの権限分離。

移動元: `AGENTS.md`。

<a id="agents-5"></a>

## TypeScript 7 と ESLint（2026-10-11）

- TypeScript 7 は `typescript-eslint` が利用する従来のコンパイラー API を提供しない。`package.json` では `@typescript/native` に TypeScript 7 の `tsc`、`typescript` に `@typescript/typescript6` の API を割り当てる。型チェックは `bun run type-check`、lint は `bun run lint` で両方を確認する。根拠は [TypeScript 7 の公式移行案内](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6-0) と `eslint.config.js` の型付き lint 設定。

移動元: `AGENTS.md`。

<a id="readme-1"></a>

## 開発

### 開発に必要な環境

- Node.js 20.0.0 以上
- bun

### 開発環境のセットアップ

```bash
# 依存関係をインストール
bun install

# 開発ビルド（ウォッチモード）＋ Firefoxで起動
bun run dev

# 本番ビルド
bun run build
```

### Firefoxへのインストール（開発用）

```bash
# 開発用にビルド＋Firefoxを起動（変更時は自動リビルド・自動リロード）
bun run dev
```

自動リビルドを使わず、ビルド済みの `dist/` を起動する場合は次を実行します。

```bash
# web-extでFirefoxを起動
bun run preview
```

または、`about:debugging` → `このFirefox` → `一時的なアドオンを読み込む` から `dist/manifest.json` を選択します。

### コマンド一覧

```bash
# 開発ビルド（ウォッチモード）＋ Firefoxで起動
bun run dev

# 本番ビルド
bun run build

# Firefoxでプレビュー（ウォッチなし）
bun run preview

# リント
bun run lint

# 型チェック
bun run type-check

# テスト
bun run test
```

TypeScript 7 の `tsc` で型チェックします。型情報を使う ESLint は TypeScript 6 の API を必要とするため、両方を開発依存に含めています。

### ディレクトリ構成

```
src/
├── background/     # Background Script
├── components/     # 共通Reactコンポーネント
├── content/        # Content Script
├── hooks/          # カスタムフック
├── i18n/           # 国際化リソース
├── options/        # 設定画面UI（React）
├── services/       # API通信・ストレージ等
├── sidebar/        # サイドバーUI（React）
├── stores/         # Zustand stores
├── styles/         # グローバルCSS
├── types/          # TypeScript型定義
├── utils/          # ユーティリティ
└── vite.config.mjs # Vite設定
```

移動元: `README.md`。

<a id="readme-2"></a>

## 依存更新の自動処理

Dependabot は対象の依存関係を毎週確認します。patch／minor 更新は PR のチェック（CI）が成功した後に自動で squash merge されます。CI の失敗ジョブは 1 回だけ再実行します。再失敗時は読み取り権限のジョブで `bun.lock` を再生成し、限定した修正コミットで CI を再実行します。修復できない PR は残します。major 更新は手動で確認します。

移動元: `README.md`。

<a id="update-1"></a>

## Dependabot PR の更新

前提は `.github/dependabot.yml` と PR 用 CI（CI）です。更新 PR の head SHA と `gh pr checks <PR番号>` の結果を確認してください。patch／minor は全チェック成功後に自動取り込みされます。初回 CI 失敗は failed jobs のみを 1 回再実行し、再失敗時は `bun.lock` の再生成を試み、修復後の CI を再実行します。変更がない場合や再度失敗した場合は PR を残します。

設定を変えたときは `actionlint .github/workflows/dependabot-automation.yml` と実際の PR の Actions 結果を確認します。問題があれば呼び出し先の共通 workflow SHA を直前の検証済み値へ戻すコミットを push します。取り込まれた依存更新に問題があれば通常の revert コミットで復旧します。

CI 完了より Dependabot の分類が遅れる場合は、`callback_workflow_file` が指す呼び出し側 workflow を `workflow_dispatch` し、同じ PR 番号・head SHA・全チェックを再確認する。呼び出し側のファイル名を変える際はこの入力も一緒に更新する。

TypeScript の major 更新では、型チェックの `tsc` と `typescript-eslint` が使う API の対応状況を確認する。TypeScript 7.0 では `@typescript/native` を `typescript` 7、`typescript` を `@typescript/typescript6` に割り当て、`bun run type-check` と `bun run lint` の両方を検証する。`bun audit` で修正版のない間接依存が残る場合は、経路と影響を `verification.md` に記録する。

移動元: `how-to-update.md`。

<a id="verification-1"></a>

## Dependabot 自動処理（2026-09-23）

`.github/workflows/dependabot-automation.yml` を actionlint で検査し、PR 用 workflow 名（CI）と一致することを確認する。Dependabot の patch／minor かつ全 PR チェック成功の場合だけ取り込み、major・古い SHA・限定修復後も失敗した PR は残す。

実際の Dependabot PR がまだない場合、動作経路は未検証として扱う。実 PR 発生後に自動化ジョブ、CI の再試行、マージ結果を確認する。

大量の Dependabot PR により CI 完了より分類が遅れる場合でも、分類後の `workflow_dispatch` が現在の PR 番号と head SHA を照合して再評価する。別の作成者、古い SHA、未完了の CI はマージしない。

移動元: `verification.md`。

## 関連文書

- [利用者向けREADME](README.md)
- [更新と復旧](how-to-update.md)
- [検証結果と未検証範囲](verification.md)
- [変更履歴](CHANGELOG.md)

## web-ext監査の再確認（2026-10-16）

公式npmメタデータではweb-ext 10.8.0が公開済みだが、引き続き@devicefarmer/adbkit 3.3.9へ依存する。node-forgeの最新は1.4.0で、GHSA-86w9-cpqp-85rvの影響範囲に残る。移動元にある10.7.0「最新」は当時の条件であり、現在の最新版を意味しない。監査を無効化・依存を削除せず、上流の修正版と依存経路を再確認する。

## node-forgeの限定修復（2026-10-16）

- 初回の文書分離時点では上流修正版未公開のためraw監査が失敗した。その後、同じGHSAに対して既にUnuniqueで使用している `patches/node-forge@1.4.0.patch` を再利用した。RSA PKCS#1 v1.5のDigestInfo内でDigestAlgorithmの余分なASN.1要素を拒否する要素数チェックを追加する。正常なNULLパラメーターとパラメーター省略は維持する。
- 対象は開発用web-ext → @devicefarmer/adbkit → node-forge 1.4.0のGHSA-86w9-cpqp-85rvだけ。npmのhigh 3パッケージは同じ1件の伝播であり、3種類の脆弱性を意味しない。製品拡張の権限・実行時ソースへは変更を加えない。
- パッチの改行LF正規化SHA-256は `bf79ed31495742976d81633581cd09531da2e28b9e9f2f8cbbc9bc98a0900d27`。修正後rsa.js全体の同SHA-256は `5ddabed1d7cbaee0649d468a0bb12de65947cef6704b6a1897944ee2c3f50bde`。版・パッチSHA・実ソース全体のSHAと修正箇所、正常／不正署名構造の回帰を監査時に検証する。
- 監査JSONの当該GHSAは表示し続け、検証済みパッチにより対応していることを明示する。未知のGHSA、別依存の警告、親パッケージ自身の別脆弱性、パッチ欠落・不一致、回帰失敗は引き続き失敗する。監査の一般的な閾値・対象を緩めない。上流修正版へ更新するときはローカルパッチと限定判定の必要性を再評価して同じ検証を行う。

BunのpatchedDependenciesとbun.lockで適用する。`bun install --frozen-lockfile` 後、`bun run audit` で実パッチとNode回帰を確認する。CIのtask matrixにもauditを含め、未知の指摘を失敗させる。Vitestの製品テスト23件とは別にNode回帰5件を実行する。

## ページ翻訳の同時推論（2026-10-19）

- OpenAI互換というAPI形式は同時推論能力を規定しない。llama.cppは`--parallel`のserver slotとcontinuous batching、Ollamaは`OLLAMA_NUM_PARALLEL`とメモリー条件、LM StudioはMax Concurrent Predictions、LocalAIとvLLMはbackend／scheduler設定で、1インスタンス内の複数リクエストを処理できる。複数インスタンスは必須ではない。
- `TranslationProfile.pageTranslationConcurrency`をページ翻訳のクライアント側上限とし、範囲は1～32、既定値と旧設定の補完値は1とする。完了数と元配列indexは別に扱い、並列完了順が前後しても対応するDOM nodeへ適用する。Google翻訳モードはこのプロファイル設定の対象外で、従来どおり順次処理する。
- 利用者向けの比較、設定方法、一次資料は`docs/PAGE_TRANSLATION_CONCURRENCY.md`を正本とする。外部実装の既定値は変わり得るため、変更時は公式資料を再確認する。
