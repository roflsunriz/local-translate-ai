# llama.cpp セットアップガイド

このドキュメントは、[llama.cpp](https://github.com/ggml-org/llama.cpp) をセットアップし、[PLaMo 3 Translate 2B GGUF](https://huggingface.co/pfnet/plamo-3-translate-2b-GGUF) を使用して翻訳サーバーを起動する手順を説明します。モデルは拡張機能とは別の[ライセンス](https://plamo.preferredai.jp/info/plamo-community-license-ja)で提供されます。

## 0. 前提条件

### 全OS共通
- **Python**: モデルのダウンロードに `hf` を使う場合に必要です。公式サイトからインストールしてください。

### Windowsでソースからビルドする場合
- **Git**: ソースコードの取得に必要です。公式サイトからインストールしてください。
- **Visual Studio**: C++のコンパイラが必要です。「C++によるデスクトップ開発」ワークロードをインストールしたVisual Studio 2019 Community以降を推奨します。
- **CMake**: ビルドシステムの生成に必要です。公式サイトからインストールしてください。
- **(任意) CUDA Toolkit**: NVIDIA製GPUを使用する場合に必要です。NVIDIA公式サイトからインストールしてください。

## 1. llama.cppの入手

`llama.cpp` を利用するには、ビルド済みの実行ファイルを使う方法（簡単）と、ソースコードから自分でビルドする方法（上級者向け）があります。

### 方法A: ビルド済みファイルを使用する (推奨)

`llama.cpp` の開発チームが定期的にビルドしたファイルを提供しています。多くの場合、こちらを利用する方が簡単です。

1.  llama.cppのReleasesページにアクセスします。
2.  最新リリースの `Assets` セクションから、お使いの環境に合ったファイルをダウンロードします。
    - **Windows (NVIDIA GPU)**: `llama-bXXXX-bin-win-cuda-cuXXX-x64.zip` のような名前のファイル
    - **Windows (CPUのみ)**: `llama-bXXXX-bin-win-avx2-x64.zip` のような名前のファイル
    - **Linux / macOS**: ご自身の環境に合わせてソースからビルドすることをお勧めします。
3.  ダウンロードしたzipファイルを解凍します。多くのビルドでは `bin/` またはルート直下に `llama-server` (Windowsは `llama-server.exe`) が含まれます。解凍先を `llama.cpp/` のような専用ディレクトリにすると、後述のモデル配置と合わせて管理しやすくなります。

この方法の場合、次の「1.1. リポジトリのクローン」と「1.2. ビルド」のセクションはスキップして、「2. 翻訳モデルのダウンロード」に進んでください。

### 方法B: ソースからビルドする

### 1.1. リポジトリのクローン

まず、`llama.cpp` のソースコードをGitHubからクローンします。(Gitがインストールされている必要があります)

```bash
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp
```

### 1.2. ビルド

お使いの環境に合わせて `llama.cpp` をビルドします。

#### macOS / Linux の場合

**CPUまたはmacOSのMetal**

```bash
cmake -B build
cmake --build build --config Release -j
```

macOSではMetal backendが既定で有効です。

**LinuxのNVIDIA CUDA**

CUDA Toolkitがインストールされている必要があります。`nvcc --version`で確認できます。

```bash
cmake -B build -DGGML_CUDA=ON
cmake --build build --config Release -j
```

#### Windows の場合

*Windowsでは、前提条件でインストールしたCMakeとVisual Studio 2019 Community以降が必要です。*

```powershell
# ビルド用ディレクトリを作成
mkdir build
cd build

# CMakeでビルドファイルを生成 (Visual Studio 2019 Communityの例)
cmake .. -G "Visual Studio 16 2019" -A x64

# NVIDIA CUDAを使う場合は、代わりに次を実行
# cmake .. -DGGML_CUDA=ON -G "Visual Studio 16 2019" -A x64

# ビルド
cmake --build . --config Release --target llama-server
```

ビルドが成功すると、`llama.cpp` ディレクトリ（Windowsの場合は `build/bin/Release`）に `llama-server` という実行ファイルが生成されます。

## 2. 翻訳モデルのダウンロード

次に、翻訳に使用する公式モデルをダウンロードします。量子化形式はメモリー容量に合わせて選べます。以下は `Q4_K_M` の例です。

`llama.cpp` のルートディレクトリに `models` ディレクトリを作成し、そこにモデルをダウンロードするのが一般的です。

```bash
mkdir models
cd models
```

Hugging Face Hubからモデルをダウンロードします。hf を使うと便利です。(Pythonがインストールされている必要があります)

```bash
# huggingface-hubが未インストールの場合はインストール
# pip install -U huggingface_hub

hf download pfnet/plamo-3-translate-2b-GGUF plamo-3-translate-2b-Q4_K_M.gguf --local-dir .
```

`wget` や `curl` を使用して直接ダウンロードすることもできます。

```bash
# wgetの場合
wget https://huggingface.co/pfnet/plamo-3-translate-2b-GGUF/resolve/main/plamo-3-translate-2b-Q4_K_M.gguf

# curlの場合
curl -L https://huggingface.co/pfnet/plamo-3-translate-2b-GGUF/resolve/main/plamo-3-translate-2b-Q4_K_M.gguf -o plamo-3-translate-2b-Q4_K_M.gguf
```

ダウンロード後、`llama.cpp` のルートディレクトリに戻ります。

```bash
cd ..
```

### 推奨ディレクトリ構成

サーバー起動時にパスを簡単に指定できるよう、以下のような構成を推奨します。

```
llama.cpp/
├── llama-server(.exe)
├── models/
│   └── plamo-3-translate-2b-Q4_K_M.gguf
└── ...
```

## 3. 翻訳サーバーの起動

`llama-server` を使用して、OpenAI互換のAPIサーバーを起動します。

```bash 
# macOS / Linux / Windows (ソースからビルドした場合) 
./llama-server -m ./models/plamo-3-translate-2b-Q4_K_M.gguf --port 3002 --host 127.0.0.1 -c 16384 --alias plamo-3-translate --jinja --no-prefill-assistant

# Windows (ビルド済みファイル or buildディレクトリから実行する場合) 
./llama-server.exe -m ../models/plamo-3-translate-2b-Q4_K_M.gguf --port 3002 --host 127.0.0.1 -c 16384 --alias plamo-3-translate --jinja --no-prefill-assistant
```

### 主なオプション

- `-m <モデルのパス>`: 使用するモデルファイルのパスを指定します。
- `--port <ポート番号>`: サーバーがリッスンするポート番号を指定します。デフォルトは `8080` です。
- `--host <ホスト名/IP>`: サーバーがバインドするホストを指定します。同じPCだけで使う場合は`127.0.0.1`に限定します。`0.0.0.0`はLANを含む外部へ公開するため、必要な場合だけAPIキーやファイアウォールと併用してください。
- `-c <コンテキストサイズ>`: 入力と出力に使う容量を指定します。公式の例は16384ですが、メモリーと同時処理数に合わせて調整します。
- `--alias plamo-3-translate`: 拡張機能の既定モデル名と合わせます。
- `--jinja --no-prefill-assistant`: GGUF内のチャットテンプレートを使う公式起動例の設定です。古いllama.cppで利用できない場合は更新してください。
- `-ngl <レイヤー数>`: GPUにオフロードするモデルのレイヤー数を指定します。GPUを使用する場合、`35` などの大きな値を指定すると高速化されます。
- `--parallel <slot数>`: 1つのサーバーで同時処理できるリクエストslot数を指定します。複数のサーバーインスタンスを起動する必要はありません。

### ページ翻訳を並列化する

Local Translate AIの既定値は、従来と同じ1件ずつの順次処理です。4件を同時処理する例は次のとおりです。

```bash
./llama-server -m ./models/plamo-3-translate-2b-Q4_K_M.gguf --port 3002 --host 127.0.0.1 -c 16384 --parallel 4 --alias plamo-3-translate --jinja --no-prefill-assistant
```

設定 > API > 対象プロファイルで「ページ翻訳の同時リクエスト数」を4にしてください。llama.cppは1インスタンス内の複数slotをcontinuous batchingで処理します。`-c`で確保したコンテキストはslot間で共有されるため、上の例では4slotに対して合計16384 tokenを確保しています。必要なメモリーと最適な値はモデル、量子化、CPU/GPU、入力長で変わります。メモリー不足や速度低下が起きる場合は、拡張機能とサーバーの両方を2または1へ下げてください。

詳細と他の推論サーバーとの違いは [ページ翻訳の同時リクエスト仕様](./docs/PAGE_TRANSLATION_CONCURRENCY.md) を参照してください。

サーバーが正常に起動すると、`http://localhost:3002` でAPIが利用可能になります。

これで、Local Translate AI拡張機能から利用する準備が整いました。API種別に `PLaMo 3 Translate (llama.cpp)`、エンドポイントに `http://localhost:3002/v1/chat/completions`、モデルに `plamo-3-translate` を設定してください。既存のPLaMo 2プロファイルは変更されないので、移行するときは新しいプロファイルを追加できます。
