# ページ翻訳の同時リクエスト仕様

確認日: 2026-10-19

Local Translate AIは、ページ内の各段落を独立したAPIリクエストとして翻訳します。APIプロファイルの「ページ翻訳の同時リクエスト数」で、同時に送るリクエストを1～32件に制限します。既定値は1で、既存設定も1として読み込みます。完了順が前後しても、翻訳結果は元の段落へ適用されます。

## 結論

- 複数インスタンスは必須ではありません。llama.cppを含む主要なローカル推論サーバーは、1インスタンス内で複数リクエストを処理できます。
- 実際に同時推論するか、待機キューへ入れるか、過負荷として拒否するかは、サーバー実装と設定、利用可能メモリーで変わります。
- OpenAI互換APIはリクエストとレスポンスの形式を揃えるものであり、並列数を共通に通知・保証する仕様ではありません。そのため、拡張機能が自動判定せず、プロファイルごとに利用者が上限を設定します。
- 値はサーバー側のslot数またはプロバイダーの許容範囲以下にします。値を増やせば常に速くなるわけではなく、KVキャッシュ使用量、1件あたりの速度、レート制限エラーが増える場合があります。

## 主要プロバイダーの挙動

| サーバー／API | 1インスタンス内の同時処理 | 超過時・設定上の注意 |
|---|---|---|
| llama.cpp | 対応。`--parallel N`でserver slot数を指定し、continuous batchingを利用できます。 | slotが埋まった後のリクエストは空きを待ちます。`-c`のコンテキストはslot間で共有されます。拡張機能の値は通常`--parallel`以下にします。 |
| Ollama | 同一モデルの並列処理に対応。`OLLAMA_NUM_PARALLEL`の既定値は1です。 | メモリーが不足する場合は順番にキュー処理されます。並列数に応じてコンテキスト用メモリーが増え、キュー上限超過時は503になります。 |
| LM Studio | llama.cpp engineでcontinuous batchingに対応し、Max Concurrent Predictionsで設定します。公式資料の既定値は4です。 | 並列処理を有効にしない場合はキュー処理されます。拡張機能の値をMax Concurrent Predictions以下にします。 |
| LocalAI | llama.cppやvLLMなど対応backendで並列処理できます。 | `--parallel-requests`とbackend側のworker／parallel設定が必要です。無効時やbackend非対応時は並列になりません。 |
| vLLM | incoming requestのcontinuous batchingに対応します。 | `max_num_seqs`などが同時処理量を制限し、キュー上限を設定した場合は超過リクエストを503で拒否します。 |
| OpenAI API | 独立した処理は並列呼び出し可能です。 | 組織・プロジェクト・モデル単位のRPM／TPMなどに従います。429／503と`Retry-After`が返る場合は同時数を下げます。 |
| OpenRouter | paid modelは主に接続先providerのレート制限に従います。 | free modelにはリクエスト上限があります。接続先の混雑や制限に合わせて同時数を下げます。 |

## 推奨設定

1. 初期値1のまま動作確認します。
2. サーバー側の並列数を確認し、拡張機能を2へ上げます。
3. ページ全体の完了時間、1段落あたりの速度、メモリー使用量、429／503を確認します。
4. 改善する間だけ段階的に増やします。ローカル環境では2～4から試すのが安全です。

1slotのサーバーへ複数リクエストを送っても、通常はサーバー側のキューで待つだけなので推論自体は並列化されません。複数インスタンスは、異なるモデルを分離する場合、1インスタンスのslot／メモリー上限を越えて水平分散する場合、障害分離が必要な場合に検討します。

## 公式資料

- [llama.cpp HTTP server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)
- [Ollama FAQ: concurrent requests](https://docs.ollama.com/faq#how-does-ollama-handle-concurrent-requests)
- [LM Studio: Parallel Requests](https://lmstudio.ai/docs/app/advanced/parallel-requests)
- [LocalAI: Concurrent requests](https://localai.io/docs/advanced/index.html#concurrent-requests)
- [vLLM documentation](https://docs.vllm.ai/en/latest/)
- [OpenAI API rate limits](https://developers.openai.com/api/docs/guides/rate-limits)
- [OpenRouter pricing and rate limits](https://openrouter.ai/pricing)
