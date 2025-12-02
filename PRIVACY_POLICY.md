# プライバシーポリシー / Privacy Policy

## 日本語

### 収集するデータ

Local Translate AI は以下のデータをブラウザのローカルストレージに保存します：

1. **設定データ**: API エンドポイント、モデル設定、プロンプト設定、表示言語設定など
2. **翻訳履歴**: 過去の翻訳テキストと翻訳結果（最大100件、設定で変更可能）
3. **API キー**: 暗号化された状態で保存されます

### データの送信先

- 翻訳テキストは、ユーザーが設定した API エンドポイント（デフォルト: localhost）にのみ送信されます
- 外部のサーバーやサードパーティにデータを送信することはありません
- すべての処理はユーザーのローカル環境で完結します

### データの保護

- API キーは Web Crypto API を使用して暗号化されます
- localhost 以外のエンドポイントへの接続には HTTPS が必須です
- 翻訳結果の表示時には XSS 対策としてサニタイズ処理を行います

### データの削除

- 設定画面から翻訳履歴を削除できます
- 拡張機能をアンインストールすると、すべてのデータが削除されます

### お問い合わせ

プライバシーに関するお問い合わせは GitHub Issues までお願いします：
https://github.com/roflsunriz/local-translate-ai/issues

---

## English

### Data Collection

Local Translate AI stores the following data in your browser's local storage:

1. **Settings**: API endpoint, model configuration, prompt settings, display language, etc.
2. **Translation History**: Past translation texts and results (up to 100 items, configurable)
3. **API Keys**: Stored in encrypted form

### Data Transmission

- Translation text is only sent to the API endpoint configured by the user (default: localhost)
- No data is sent to external servers or third parties
- All processing is completed within the user's local environment

### Data Protection

- API keys are encrypted using the Web Crypto API
- HTTPS is required for connections to endpoints other than localhost
- Translation results are sanitized to prevent XSS attacks when displayed

### Data Deletion

- Translation history can be deleted from the settings page
- All data is deleted when the extension is uninstalled

### Contact

For privacy-related inquiries, please use GitHub Issues:
https://github.com/roflsunriz/local-translate-ai/issues

---

最終更新日 / Last Updated: 2024-12-02

