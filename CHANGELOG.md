# Changelog

このプロジェクトの主な変更点を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) に基づき、
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) に準拠しています。

## [Unreleased]

### Fixed

- CI と Dependabot の分類の実行順が前後しても更新を取りこぼさないよう、同じ PR 番号と head SHA を再照合する経路を追加した。
- plugin-react 6 が要求する `vite/internal` が Vite 7 に存在せずビルドできないため、Vite を 8 系へ同時更新してビルド失敗を解消した。

### Changed

- 依存更新を安全に省力化するため、Dependabot の patch／minor PR を既存 CI の全チェック成功後に自動取り込みし、失敗ジョブを一度再実行し、必要なら `bun.lock` を限定して再生成する設定を追加した。
- 開発基盤を最新に保つため、Dependabot の major 更新を取り込んだ（`@types/node` 25→26、`@vitejs/plugin-react` 5→6、Vite 7→8、actions/checkout 4→7、actions/setup-node 4→7、actions/download-artifact 4→8、actions/upload-artifact 4→7、softprops/action-gh-release 2→3）。

## [1.8.0] - 2026-09-16

### Added

- 開発中の確認手順を短くするため、`bun run dev` でウォッチビルドと拡張機能入りFirefoxの起動をまとめて行えるようにした。

### Fixed

- IPアドレス指定のローカルAPIエンドポイントで翻訳が失敗しないように、拡張機能の接続許可へループバックアドレス（127.0.0.0/8、`::1`）を追加し、HTTP許可判定をlocalhostだけからループバック全体へ広げた。

### Security

- push前監査で検出された既知の依存脆弱性を解消するため、安全版へ依存関係とロックファイルを更新した。
- リリース前の脆弱性検査で検出された依存パッケージの脆弱性を解消するため、影響パッケージを安全版へ更新した。

### Changed

- 作業開始時の共通指針見落としを防ぐため、調査やコマンド実行より前に `COMMON-AGENTS.md` を先頭から末尾まで読み、EOFを確認する必須ゲートを追加した。

## [1.7.0] - 2026-08-02

### Added

- AMO本番の対応ロケールに合わせて、拡張機能の名前・説明・操作名をWebExtension i18nで表示できるようにした。
- AMO掲載ページの名前、概要、詳細説明、開発者コメント、ホームページ、サポートURL、リリースノートを14地域ロケールへ翻訳した。
- AMOメタデータとmanifestローカライズの欠落や概要文字数超過を検出する検証コマンドを追加した。

### Changed

- AMOのlisted提出時に掲載メタデータとソースコードアーカイブを同時に送信し、GitHub Actionsから新バージョンを提出できるようにした。

## [1.6.0] - 2026-05-08

### 追加

- `source_language` / `target_language` を省略可能にし、プロファイルの既定値を使って翻訳できるようにしました。
- システムプロンプトとユーザープロンプトのテンプレート変数展開を共通化し、`input_text` / `output_text` などを扱えるようにしました。
- リリース手順をまとめた `how-to-update.md` を追加しました。

## [1.5.2] - 2026-05-07

### 追加

- ページを閉じたときに翻訳を強制中止する機能を追加しました。

## [1.5.1] - 2026-05-07

### 追加

- 翻訳ポップアップをリサイズ可能にしました。
- テスト手順を `docs/TESTING.md` に追加しました。

### 変更

- 新しいAPIタイプへの翻訳対応を追加し、UIの言語選択肢を拡張しました。
- 翻訳リクエストに request ID を導入し、エラー処理を改善しました。
- 日本語翻訳ガイドラインをシステムプロンプトに反映しました。

## [1.5.0] - 2026-03-30

### 追加

- Google翻訳モードを追加（サイドバーと設定画面にトグルスイッチを配置、APIキー不要でGoogle翻訳APIを利用可能）
- 再利用可能なトグルスイッチUIコンポーネントを追加
- ページ全体翻訳でもGoogle翻訳モードに対応

## [1.4.2] - 2025-12-16

### 変更

- デフォルトシステムプロンプトを日本語表現に変更。さらに、敬体表現を禁止し常に常体表現で翻訳するように指定。

## [1.4.1] - 2025-12-09

### 修正

- ポップアップウィンドウが外部クリックで閉じてしまう問題を修正（設定で「スクロールやリサイズ時にポップアップを閉じる」がオンの場合のみ外部クリックで閉じるように変更）

## [1.4.0] - 2025-12-09

### 追加

- 設定画面に「履歴」タブを追加（サイドバー以外でも履歴を確認・削除・コピー可能）
- 翻訳ポップアップの動作設定を追加（デフォルトでスクロール・リサイズ時に閉じなくなった）

### 変更

- 翻訳ポップアップがデフォルトで閉じるボタン以外では閉じなくなりました（以前の動作は設定で復元可能）

## [1.3.0] - 2025-12-06

### 追加

- Anthropic Messages API形式での翻訳に対応（設定でAPI種別を切り替え可能）
- API設定画面にAPI種別の表示と編集を追加
- READMEにAnthropic利用手順を追記

## [1.2.0] - 2025-12-04

### 追加

- テキスト選択翻訳ポップアップがドラッグ移動可能に

## [1.1.0] - 2025-12-04

### 追加

- 翻訳結果に米ドルから日本円への換算機能を追加
- AIモデルのパラメータサイズ変換機能（B/Mを億・万単位に）
- 設定画面に変換オプションのトグルを追加
- サイドバー、ページ全体翻訳、テキスト選択翻訳にプログレスバーを表示
- 全ての翻訳モードでトースト通知を表示

### 変更

- 日本語ロケールの通貨フォーマットを改善
- 変換オプションとサニタイズによる翻訳プロセスの改善
- ページ全体翻訳が段落ごとに順次処理されるように改善（UX向上）

## [1.0.0] - 2025-12-04

### 追加

- 多言語サポート（13言語: 日本語、英語、中国語、韓国語、スペイン語、フランス語、ポルトガル語、ロシア語、アラビア語、ヒンディー語、ベンガル語、インドネシア語）
- UI全体にMaterial Design Iconsを導入
- テキスト選択翻訳ポップアップに2つのコピーボタン（原文/翻訳文）を追加
- 新しい96x96アイコンで視認性を向上
- AMO申請ドキュメントを追加

### 変更

- 翻訳ポップアップの絵文字をMDIアイコンに置換
- マニフェストと設定でキーボードショートカットを更新
- DOM操作を改善した翻訳ポップアップの強化
- manifest.jsonのデータ収集権限を更新
- パッケージ依存関係を更新し、pnpm lockfileを追加

### 修正

- フロントエンドとバックグラウンド間の設定同期問題
- サイドバーの翻訳レスポンスメッセージ処理
- コンテンツスクリプトへの翻訳結果ブロードキャスト
- CORS、Promise処理、i18nの問題
- コンテンツスクリプト内のMDIアイコンパスをインライン化

## [0.1.0] - 2024-12-02

### 追加

- Local Translate AIの初回リリース
- テキスト選択翻訳とポップアップ表示
- ストリーミング対応のサイドバー翻訳パネル
- 進捗表示付きのページ全体翻訳
- 翻訳履歴（最大100件）
- 複数の翻訳プロファイル
- キーボードショートカット（翻訳: Ctrl+Shift+T、サイドバー: Ctrl+Shift+S）
- ダークモード対応（システム設定連動 + 手動切り替え）
- 5つのタブを持つ設定ページ:
  - 一般: UI言語、テーマ、通貨換算
  - API: プロファイル管理、エンドポイント設定
  - プロンプト: システムプロンプトとユーザープロンプトテンプレートのカスタマイズ
  - 詳細: ストリーミング、履歴、リトライ設定、除外パターン
  - ショートカット: キーボードショートカット設定
- 設定のエクスポート/インポート機能
- コンテキストメニュー統合
- 設定可能なリトライ回数と間隔
- Web Crypto APIを使用したAPIキー暗号化
- localhost以外のエンドポイントに対するHTTPS検証
- 翻訳結果の米ドル→円換算
- AIモデルのパラメータサイズ変換（B/Mを億・万単位に）
- 翻訳除外パターン（コードブロック、URL、数式、メールアドレス）
- ページ翻訳時の原文ホバー表示
- 翻訳状況のトースト通知

### セキュリティ

- AES-GCMによるAPIキー暗号化
- Content Security Policyの設定
- 翻訳コンテンツのDOMサニタイズ
- 外部エンドポイントへのHTTPS強制

[1.7.0]: https://github.com/roflsunriz/local-translate-ai/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/roflsunriz/local-translate-ai/compare/v1.5.2...v1.6.0
[1.5.1]: https://github.com/roflsunriz/local-translate-ai/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/roflsunriz/local-translate-ai/compare/v1.4.2...v1.5.0
[1.4.2]: https://github.com/roflsunriz/local-translate-ai/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/roflsunriz/local-translate-ai/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/roflsunriz/local-translate-ai/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/roflsunriz/local-translate-ai/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/roflsunriz/local-translate-ai/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/roflsunriz/local-translate-ai/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/roflsunriz/local-translate-ai/compare/v0.1.0...v1.0.0
[Unreleased]: https://github.com/roflsunriz/local-translate-ai/compare/v1.7.0...HEAD
[0.1.0]: https://github.com/roflsunriz/local-translate-ai/releases/tag/v0.1.0
