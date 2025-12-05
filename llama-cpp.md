# llama.cpp セットアップガイド

このドキュメントは、[llama.cpp](https://github.com/ggml-org/llama.cpp) をセットアップし、[PLaMo-2-Translate](https://huggingface.co/mmnga/plamo-2-translate-gguf) モデルを使用して翻訳サーバーを起動する手順を説明します。

## 0. 前提条件

### 全OS共通
- **Python**: モデルのダウンロードに `huggingface-cli` を使う場合に必要です。公式サイトからインストールしてください。

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

**CPUのみ**

```bash
make
```

**GPU (Metal for macOS, CUDA for Linux)**

macOS (Metal):
```bash
LLAMA_METAL=1 make
```

Linux (CUDA):
*CUDA Toolkitがインストールされている必要があります。 nvcc --version で確認できます。 NVIDIA公式サイトからインストールしてください。*
```bash
LLAMA_CUDA=1 make
```

#### Windows の場合

*Windowsでは、前提条件でインストールしたCMakeとVisual Studio 2019 Community以降が必要です。*

```powershell
# ビルド用ディレクトリを作成
mkdir build
cd build

# CMakeでビルドファイルを生成 (Visual Studio 2019 Communityの例)
# GPUを使う場合は -DLLAMA_CUBLAS=on を付ける
cmake .. -DLLAMA_BUILD_SERVER=ON -G "Visual Studio 16 2019" -A x64
# CPUのみの場合
# cmake .. -DLLAMA_BUILD_SERVER=ON -G "Visual Studio 16 2019" -A x64

# ビルド
cmake --build . --config Release --target llama-server
```

ビルドが成功すると、`llama.cpp` ディレクトリ（Windowsの場合は `build/bin/Release`）に `llama-server` という実行ファイルが生成されます。

## 2. 翻訳モデルのダウンロード

次に、翻訳に使用するモデル `plamo-2-translate-gguf` をダウンロードします。

`llama.cpp` のルートディレクトリに `models` ディレクトリを作成し、そこにモデルをダウンロードするのが一般的です。

```bash
mkdir models
cd models
```

Hugging Face Hubからモデルをダウンロードします。huggingface-cli を使うと便利です。(Pythonがインストールされている必要があります)

```bash
# huggingface-hubが未インストールの場合はインストール
# pip install -U "huggingface_hub[cli]"

huggingface-cli download mmnga/plamo-2-translate-gguf plamo-2-translate.Q4_K_M.gguf --local-dir . --local-dir-use-symlinks False
```

`wget` や `curl` を使用して直接ダウンロードすることもできます。

```bash
# wgetの場合
wget https://huggingface.co/mmnga/plamo-2-translate-gguf/resolve/main/plamo-2-translate.Q4_K_M.gguf

# curlの場合
curl -L https://huggingface.co/mmnga/plamo-2-translate-gguf/resolve/main/plamo-2-translate.Q4_K_M.gguf -o plamo-2-translate.Q4_K_M.gguf
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
│   └── plamo-2-translate.Q4_K_M.gguf
└── ...
```

## 3. 翻訳サーバーの起動

`llama-server` を使用して、OpenAI互換のAPIサーバーを起動します。

```bash 
# macOS / Linux / Windows (ソースからビルドした場合) 
./llama-server -m ./models/plamo-2-translate.Q4_K_M.gguf --port 3002 --host 0.0.0.0 -c 4096

# Windows (ビルド済みファイル or buildディレクトリから実行する場合) 
./llama-server.exe -m ../models/plamo-2-translate.Q4_K_M.gguf --port 3002 --host 0.0.0.0 -c 4096
```

### 主なオプション

- `-m <モデルのパス>`: 使用するモデルファイルのパスを指定します。
- `--port <ポート番号>`: サーバーがリッスンするポート番号を指定します。デフォルトは `8080` です。
- `--host <ホスト名/IP>`: サーバーがバインドするホストを指定します。`0.0.0.0` を指定すると、外部からのアクセスを許可します。
- `-c <コンテキストサイズ>`: モデルのコンテキストサイズを指定します。デフォルトは `512` です。PLaMoモデルの場合は `4096` 程度を推奨します。
- `-ngl <レイヤー数>`: GPUにオフロードするモデルのレイヤー数を指定します。GPUを使用する場合、`35` などの大きな値を指定すると高速化されます。

サーバーが正常に起動すると、`http://localhost:3002` でAPIが利用可能になります。

これで、Local Translate AI拡張機能から利用する準備が整いました。拡張機能の設定で、APIエンドポイントを `http://localhost:3002/v1/chat/completions` に設定してください。
