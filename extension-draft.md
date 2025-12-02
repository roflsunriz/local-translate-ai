# Firefox用翻訳拡張機能 local-translate-ai

凡例 : [✅️]:実装済み []:未着手 [-]:進行中

## 概要
- llama.cppでホストしたモデルを使用して翻訳を行う拡張機能(OpenAI 互換APIに対応)
- デフォルト設定はPLaMo設定に最適化済みですが、ユーザーが自由に設定を変更できます。

## 技術スタック
- TypeScript
- React
- Zustand（状態管理）
- Tailwind CSS
- Vite + web-ext（ビルド・開発）
- Vitest（ユニットテスト）
- Playwright（E2Eテスト）
- Firefox Extension API（Manifest V2）

## アーキテクチャ
- [✅️] Manifest V2（Firefox安定版対応、strict_min_version: 109.0）
- [✅️] Content Script: テキスト選択検知、翻訳ボタン表示、DOM操作
- [✅️] Background Script: API通信、キャッシュ管理、状態管理
- [✅️] Sidebar: React SPA（翻訳UI）
- [✅️] Options Page: React SPA（設定画面）
- [✅️] ストレージ: browser.storage.local（設定・キャッシュ・履歴）

## 機能

### テキスト選択翻訳
- [✅️] テキスト選択時に翻訳ボタンが表示される
- [✅️] ボタンを押すと選択したテキストが翻訳される
- [✅️] ボタン付近に翻訳結果がポップアップで表示される
- [✅️] 翻訳結果はコピーできる（フォーマット済み/フォーマットなし）
- [✅️] サイドバーにも翻訳結果が表示される

### ページ全体翻訳
- [✅️] ページ全体を翻訳するボタンが右クリックメニューに表示される
- [✅️] ページのフォーマットを維持したままテキストノードが翻訳結果に置き換えられる
- [✅️] 翻訳プログレス表示（進捗%）
- [✅️] 原文/訳文の比較表示（ホバーで原文表示）
- [✅️] 翻訳結果は自動でキャッシュされて次回以降の翻訳に使用される

### サイドバー翻訳
- [✅️] テキストエリアにテキストを入力して翻訳ボタンを押すと翻訳される
- [✅️] 翻訳結果はコピーできる（フォーマット済み/フォーマットなし）
- [✅️] クリアボタンで入力テキストをクリアできる

### キーボードショートカット
- [✅️] Ctrl+Shift+T: 選択テキストをクイック翻訳
- [✅️] Ctrl+Shift+S: サイドバー表示/非表示切り替え
- [✅️] ショートカットはオプションでカスタマイズ可能

### 翻訳履歴
- [✅️] 過去の翻訳履歴を保存（最大100件、設定で変更可能）
- [✅️] サイドバーから履歴を参照・再利用可能
- [✅️] 履歴のクリア機能

### 翻訳制御
- [✅️] 翻訳中のキャンセル機能
- [✅️] ストリーミング対応（SSEで逐次表示）
- [✅️] API失敗時の自動リトライ（最大3回、間隔1秒）
- [✅️] 翻訳除外パターン設定（コードブロック、URL、数式等）

## UIイメージ

### 設定画面
- [✅️] それぞれの項目はカテゴリー別タブ切り替えで表示
- [✅️] 表示言語切り替え(デフォルト：自動)(対応言語：自動、日本語、英語、中国語、韓国語、スペイン語、ポルトガル語、ロシア語、ヒンディー語、アラビア語、フランス語、ベンガル語、インドネシア語)
- [✅️] インポート・エクスポート機能
- [✅️] 自動→日本語、英語→日本語限定で変換結果の米ドルとAIモデルのパラメータ数換算結果付与機能オン・オフと1ドル何円の設定
- [✅️] プロファイル切り替え(デフォルト：Default-PLaMo2-Llama-cpp)
- [✅️] APIエンドポイント設定(デフォルト：http://localhost:3002/v1/chat/completions)
- [✅️] APIキー設定(デフォルト：test)
- [✅️] モデル設定(デフォルト：plamo-2-translate-gguf)
- [✅️] タイムアウト設定(デフォルト：600秒)
- [✅️] ソース言語設定(デフォルト：auto)
- [✅️] ターゲット言語設定(デフォルト：Japanese)
- [✅️] システムプロンプト設定(デフォルト：You are a highly skilled translation engine with expertise in the technology sector. Your function is to translate texts accurately into the {{target_language}}, maintaining the original format, technical terms, and abbreviations. Do not add any explanations or annotations to the translated text. )
- [✅️] プロンプト設定(デフォルト：<|plamo:op|>dataset
  translation
  <|plamo:op|>input lang={{source_language}}
  {{input_text}}
  <|plamo:op|>output lang={{target_language}})
- [✅️] 注意書き プロンプト設定で利用可能な変数は{{source_language}}と{{target_language}}と{{input_text}}と{{output_text}}です。
- [✅️] 翻訳除外パターン設定（正規表現対応）
- [✅️] 翻訳除外パターンのデフォルトはコードブロック、URL、数式等
- [✅️] キーボードショートカット設定
- [✅️] 履歴保存件数設定（デフォルト：100件）
- [✅️] リトライ回数・間隔設定（デフォルト：3回、間隔1秒）
- [✅️] 保存ボタンで設定を保存できる

### ツールバー
- [✅️] 設定ボタン
- [✅️] GithubのIssueリンク

### サイドバー
- [✅️] 翻訳ボタン
- [✅️] 入力テキストエリア
- [✅️] 翻訳結果（ストリーミング表示対応）
- [✅️] コピーボタン（フォーマット済み）
- [✅️] コピーボタン（フォーマットなし）
- [✅️] クリアボタン
- [✅️] 履歴タブ
- [✅️] キャンセルボタン（翻訳中のみ表示）

### その他
- [✅️] 拡張機能そのものとサイドバー用の最適化済みアイコンを用意
- [✅️] 「翻訳を開始しました」「翻訳処理中…」「翻訳が完了しました」「APIエラー」「タイムアウト」「不明なエラー」というトースト通知を表示。不明なエラーはトースト通知内でエラー内容を詳細表示、またコンソールログにもエラー内容を詳細表示。
- [✅️] ダークモード対応（prefers-color-scheme連動 + 手動切り替え）

## セキュリティ
- [✅️] APIキーの暗号化保存（Web Crypto API使用）
- [✅️] CSP設定（manifest.jsonでcontent_security_policy定義）
- [✅️] 翻訳結果のDOM挿入時はサニタイズ処理（DOMPurify使用）
- [✅️] localhost以外のエンドポイント使用時はHTTPS必須

## 公開・運用
- [✅️] 対応Firefoxバージョン: 109.0以上
- [✅️] ライセンス: MIT
- [✅️] プライバシーポリシー: AMO公開用に用意
- [✅️] CHANGELOG: Conventional Commits形式で管理
- [✅️] AMO公開手順: web-ext sign使用

## ディレクトリ構成（予定）
```
local-translate-ai/
├── src/
│   ├── background/          # Background Script
│   ├── content/             # Content Script
│   ├── sidebar/             # サイドバーUI（React）
│   ├── options/             # 設定画面UI（React）
│   ├── components/          # 共通Reactコンポーネント
│   ├── hooks/               # カスタムフック
│   ├── stores/              # Zustand stores
│   ├── services/            # API通信・暗号化等
│   ├── utils/               # ユーティリティ
│   └── types/               # 型定義
├── public/
│   ├── icons/               # 拡張機能アイコン
│   └── _locales/            # i18nリソース
├── tests/
│   ├── unit/                # Vitestユニットテスト
│   └── e2e/                 # Playwright E2Eテスト
├── manifest.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```
