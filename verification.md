# 検証手順

## 2026-11-06: プロンプト設定と1.10.1

- Hy-MT2の公式資料で、英語・中国語の指示にはそれぞれの言語名を使うことと、標準systemプロンプトが空であることを確認した。実モデルは公式Hy-MT2 1.8B Q4_K_MのSHA-256を配布元と照合し、一時ポートのllama-server（CPU）で使用した。
- 一時Firefoxの設定画面で、PLaMo 3・OpenAI互換の両方に入力欄が表示され、種別を往復しても手入力が残ること、PLaMo 2の既定・汎用テンプレート・システム欄の消去、保存と再読込みを確認した。Hy-MT2で中国語→英語と、中文指示・`{{target_language_zh}}`を使った英語→中国語を拡張機能から実行した。中国語UIの339px幅で画面全体の横はみ出しもなかった。
- PLaMo 3 2Bでも拡張機能から英日・日英、通常・ストリーミング、選択翻訳とページ翻訳メッセージを再確認した。ページ翻訳のコンテキストメニュー自体は操作していない。
- 固定インストール、lint、型検査、build、Vitest 54件、依存監査、AMO情報検証、AMO lintと配布ZIP生成が成功した。AMO lintには既存のReact生成コード由来の `innerHTML` 警告が2件残る。素の監査に残るdeepmergeの警告は既存の限定パッチと回帰で検証し、他の未確認警告は失敗させる。依存更新の残件はなかった。
- 最初のGitHub CIではNode 20に `navigator` がなく画面テストが失敗し、非対応のVitest 5.1 reporterも `Map.groupBy` 不在で詳細を表示できなかった。Node 20でJSON reporterを使って原因を再現し、テストにブラウザーの言語情報を与えた後に同じ3件が通過した。CI・公開用Nodeを24 LTSへ更新し、Node 24で全54件を再実行した。
- 公式Hy-MT2の2bit GGUFは手元の2種類のサーバーでtensor offsetの不一致となり、Q4_K_Mで実測した。GPU、他の量子化形式・モデル、全言語の組合せは未検証。

## 2026-11-06: PLaMo 3 Translate対応と1.10.0

- 公式2B GGUF Q4_K_MのSHA-256を配布元のmetadataと照合し、一致した既存ファイルを一時ポートのllama-server（build 11869、CPU）で起動した。英日・日英の翻訳と日本語の敬体を確認し、利用中のサーバーやモデルは変更していない。
- 一時Firefoxプロファイルへビルドした拡張を読み込み、新規の既定プロファイル、設定の保存と文体変更、ストリーミング／通常のサイドバー翻訳、選択翻訳ボタン、ページ翻訳メッセージによる2段落への反映、非対応言語のエラー表示を確認した。設定画面の339px幅で横方向の画面全体のはみ出しがないことを確認した。ページ翻訳のコンテキストメニュー自体は操作していない。
- `bun install --frozen-lockfile`、lint、型検査、build、Vitest 48件、依存監査とNode回帰6件、AMO情報検証、AMO lint、配布ZIP生成が成功した。通信データを7バイト単位で分割し、UTF-8・改行・JSONをまたぐストリーミングの復元も検証した。GitHub Actionsは公式配布物のハッシュを照合したactionlint 1.7.12で検査した。AMO lintには既存のReact生成コードに由来する `innerHTML` 警告2件が残る。監査はdeepmergeの既知警告を限定パッチと攻撃回帰で確認し、それ以外の未確認の警告を失敗させる。`bun outdated` の残件はなかった。
- GitHubのCI（run 42182882264）とリリースworkflow（run 42182962241）が成功した。AMOの1.10.0はlisted・public・審査済みで、GitHub Releaseの署名済みXPIを取得し、SHA-256、manifestの版、署名、background・設定画面・サイドバーの同梱を確認した。
- PLaMo 3の0.8B・8B・31BやGPU、公式対応言語の全組合せは実機検証していない。

## 2026-10-31: 依存監査と回帰

- typescript-eslintのparserとeslint-pluginが実効版8.72.1で一致し、pluginのparser peer要件 `^8.72.1` を満たすこと、固定インストール・監査・lint・型検査が成功することを確認した。
- `node-forge` 1.4.2の公式実装はDigestInfoの正規DERを照合する。旧パッチを外し、正常構造の受理と余分な要素の拒否を既存回帰で確認した。
- `deepmerge` 4.3.1は修正版が未公開のため、[上流PR #274](https://github.com/TehShrike/deepmerge/pull/274)を基に3入口へパッチを適用した。nullプロトタイプ、nullの入れ子、攻撃データを含む元対象、配列要素でプロトタイプが汚染されないことと通常の結合を確認した。
- [作者のminimatch勧告](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249)は10.2.6の最適化処理を対象とするが、監査DBは3系を含む `<11.0.1` を表示する。3.1.5の `make()` に該当の反復処理がないことをソース全体のSHA-256で固定し、`**/../a/b/` の再現入力では10.2.5で1〜5回の反復が2・4・8・16・32候補に増える一方、3.1.5では128回でも1候補・513部分であることを確認した。10系は11.0.1へ更新し、未確認の版や別の勧告は失敗させる。
- `bun run audit` は素の監査結果を表示し、上記2件だけをパッチ・実ファイル・攻撃回帰の成功を条件に判定する。未知の勧告、パッチ改変、依存版変更、テスト失敗を拒否する。
- Bun 1.4.0で固定インストール、lint、型検査、Vitest 30件、Node回帰6件、buildとAMO情報検証が成功した。AMO lintはエラー0件、既存のReact生成コード由来の `innerHTML` 警告2件だった。一時Firefoxで実際の拡張を読み込み、設定画面とサイドバーの描画と初期エラー0件を確認した。

## 2026-10-19: CI高速化

- 変更したGitHub Actionsをactionlint 1.7.12で検査し、エラー0件を確認した。
- GitHub上の未解決Dependabot更新PRと依存脆弱性アラートがともに0件であることを確認した。

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

## 2026-10-20: Dependabot 月末一括処理

- `.github/dependabot.yml` は毎月28日00:00、`.github/workflows/dependabot-automation.yml` は同日18:00（いずれも `Asia/Tokyo`）に設定した。呼び出し先は検証済み共通 workflow の固定 SHA とし、現在の head SHA、Dependabot の資格状態、全 PR チェック成功を merge 前に再確認する。
- YAML 構文、変更差分、空白エラーをローカルで検査した。実際の月末 schedule と Dependabot PR の merge 経路は、次回の毎月28日実行で確認する。
