# AMO (addons.mozilla.org) 公開手順

## 事前準備

### 1. アカウント作成

1. [Firefox Accounts](https://accounts.firefox.com/) でアカウントを作成
2. [AMO Developer Hub](https://addons.mozilla.org/developers/) にログイン

### 2. 開発者情報の設定

1. Developer Hub で開発者プロフィールを完成
2. 連絡先情報を登録

## ビルドと署名

### 1. プロダクションビルド

```powershell
bun run build
```

### 2. 拡張機能のパッケージング

```powershell
# web-ext を使用してパッケージを作成
bun run zip:dist
```

これにより `web-ext-artifacts/` に `.zip` ファイルが生成されます。

### 3. ソースコードの準備

AMO レビューでは、ビルドされたコードと一緒にソースコードの提出が求められます：

```powershell
# ソースコードを zip 化（node_modules を除外）
git archive --format=zip --output=source-code.zip HEAD
```

### 4. 掲載ページのローカライズ

AMO本番の言語切替で提供されているロケールを確認し、既存の拡張機能翻訳と対応する14地域ロケールの掲載メタデータを `amo-metadata.json` に管理しています。`name`、`summary`、`description`、`developer_comments`、`homepage`、`support_url`、`support_email`、バージョンの `release_notes` を同じロケール集合で保持してください。

```powershell
bun run amo:validate
```

`web-ext sign --channel "listed"` は `amo-metadata.json` を使用して既存掲載のメタデータを更新し、新しいlistedバージョンを提出します。AMO APIでは既存掲載のメタデータ更新とバージョン作成が別責務になっているため、メタデータを省略して提出しないでください。

## AMO への提出

### 1. 新規アドオンの登録

1. [Submit a New Add-on](https://addons.mozilla.org/developers/addon/submit/) にアクセス
2. 「On this site」を選択（AMO で配布する場合）

### 2. ファイルのアップロード

1. `web-ext-artifacts/` 内の `.zip` ファイルをアップロード
2. 自動検証を待つ

### 3. アドオン情報の入力

#### 基本情報

- **Name**: Local Translate AI
- **Add-on URL**: local-translate-ai
- **Summary**: `amo-metadata.json` の各ロケールに記載した概要を使用します。

#### 詳細説明

```
詳細説明は `amo-metadata.json` の各ロケールに記載した内容を使用します。llama.cppを使用する場合は端末内で翻訳できますが、クラウドAPIやGoogle翻訳を設定した場合は、選択テキストやページ内容が設定先へ送信されます。
```

#### カテゴリ

- Privacy & Security

#### タグ

- translation
- privacy
- local
- llm
- ai

### 5. プライバシーポリシー

PRIVACY_POLICY.md の内容を入力

### 6. ソースコードの提出

1. 「Yes」を選択
2. `source-code.zip` をアップロード
3. ビルド手順を記載：

```powershell
# Node.js 20.x と Bun が必要です

# 依存関係のインストール
bun install --frozen-lockfile

# ビルド
bun run build

# ビルド結果は dist/ フォルダに出力されます
```

## レビュー対応

### よくある指摘事項

1. **権限の説明不足**
   - 各権限が必要な理由を説明する

2. **minified コードの使用**
   - ソースコードを提出し、ビルド手順を明記

3. **外部リソースの読み込み**
   - すべてのリソースはローカルに含める

### レビュー期間

- 通常: 数日〜2週間
- 初回提出: やや長めになる可能性あり

## 更新手順

1. `package.json` と `public/manifest.json` のバージョン番号を更新
2. `CHANGELOG.md` と `amo-metadata.json` のリリースノートを更新
3. `bun run amo:validate`、`bun run lint`、`bun run type-check`、`bun run build`、`bun run test` を実行
4. `main` と `vX.Y.Z` タグをpushする。GitHub ActionsがAMOのlisted提出とGitHub Release作成を実行

## web-ext での署名（自己配布用）

AMO を経由せずに署名する場合：

```powershell
# API キーを取得（https://addons.mozilla.org/developers/addon/api/key/）
# 環境変数を設定
$env:WEB_EXT_API_KEY = "your-api-key"
$env:WEB_EXT_API_SECRET = "your-api-secret"

# 署名
bun run sign:unlisted
```
# 自己配布用（審査不要）
bun run sign:unlisted

# 注意: --channel "listed"はAMO審査完了後の更新時に使用します
# 初回提出時や審査中は使用できません

## 自動検証の警告について

### innerHTML警告（React DOM内部コード）

AMO自動検証で以下のような警告が表示される場合があります：

```
Unsafe assignment to innerHTML
assets/global-*.js 行: XXXXX
```

**これはReact DOMライブラリ内部のコードが原因であり、本拡張機能のソースコードではありません。**

#### 技術的詳細

React DOMは`dangerouslySetInnerHTML`プロップを処理するために内部で`innerHTML`を使用します：

```javascript
// React DOM内部コード（ユーザーコードではない）
case "dangerouslySetInnerHTML":
  domElement.innerHTML = key;
  break;
```

このコードは、アプリケーションが`dangerouslySetInnerHTML`を使用していなくてもReact DOMバンドルに含まれます。

#### 本拡張機能の対応

1. **`dangerouslySetInnerHTML`は一切使用していません** - ソースコード全体を検索しても該当なし
2. **Content Scriptは安全なDOM APIを使用**:
   - `document.createElement()` - 要素作成
   - `element.textContent` - テキスト設定
   - `element.appendChild()` - 子要素追加
3. **DOMPurifyを依存関係に含む** - 将来的なHTML無害化に対応可能

#### レビュアーへの説明

```
The innerHTML warnings are from React DOM's internal implementation
for handling the dangerouslySetInnerHTML prop. This extension does
NOT use dangerouslySetInnerHTML anywhere in its source code.

All DOM manipulation in content scripts uses safe DOM APIs:
- document.createElement()
- element.textContent
- element.appendChild()

You can verify by searching the source code:
- Select-String -Path src\* -Pattern "dangerouslySetInnerHTML" -Recurse  → No results
- Select-String -Path src\* -Pattern "innerHTML" -Recurse  → No results
```

## トラブルシューティング

### ビルドエラー

```powershell
# キャッシュをクリアして再ビルド
Remove-Item -Recurse -Force dist, node_modules -ErrorAction SilentlyContinue
bun install --frozen-lockfile
bun run build
```

### 検証エラー

```powershell
# 事前検証
bun run amo:lint
```

### 権限に関する警告

manifest.json の権限を最小限に保つ：
- `activeTab`: 現在のタブへのアクセス
- `storage`: 設定保存
- `contextMenus`: 右クリックメニュー
- `notifications`: トースト通知
