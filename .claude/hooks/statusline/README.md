# statusline hook

Claude Codeのステータスラインをカスタマイズし、モデル名、ディレクトリ、トークン使用量を表示するStatusline hook。

> **Quick Setup**: Claude Codeに「このREADME.mdを読んでセットアップして」と伝えるだけで設定できます。

## ファイル構成

```text
.claude/hooks/statusline/
├── statusline.js          # メインスクリプト
├── hooks.json.example     # Claude Code hook設定例
└── README.md              # このファイル
```

## 機能

- **プラットフォーム表示**: OS環境を絵文字で表示
  - 🪟 Windows
  - 🐧 Linux/WSL
  - 🍎 macOS
  - 💻 その他
- **モデル表示**: 現在使用中のモデル名を表示（例: Sonnet 4.5）
- **ディレクトリ表示**: 現在の作業ディレクトリ名を表示
- **トークン使用量**: 現在のコンテキスト使用量を表示（K/M単位）
- **使用率表示**: コンテキスト使用率を色付きで表示（緑→黄→赤）
  - 緑: 0-69%
  - 黄: 70-89%
  - 赤: 90%以上

## 表示例

```
🪟 [Sonnet 4.5] 📁 my-project | 🪙 45.2K | 68%
```

## セットアップ

### 1. hookスクリプトの配置確認

このREADME.mdがあるディレクトリに `statusline.js` があることを確認してください。

### 2. settings.jsonの設定

**重要**: 設定ファイルの場所とOSに応じて、適切な `command` パスを選択してください。

#### パターン1: グローバル設定（ユーザーディレクトリ）

**ファイル**: `~/.claude/settings.json` または `C:\Users\<username>\.claude\settings.json`

**Linux/macOS/WSL**:
```json
{
  "hooks": {
    "Statusline": [
      {
        "type": "command",
        "command": "~/.claude/hooks/statusline/statusline.js"
      }
    ]
  }
}
```

**Windows**:
```json
{
  "hooks": {
    "Statusline": [
      {
        "type": "command",
        "command": "node %USERPROFILE%/.claude/hooks/statusline/statusline.js"
      }
    ]
  }
}
```

**説明**:
- `%USERPROFILE%/.claude/` にhookスクリプトを配置した場合に使用
- 全プロジェクトで共通のステータスライン表示を適用
- Windowsでは `.js` ファイルを直接実行できないため、`node` コマンドプレフィックスが必要
- `%USERPROFILE%` は Windows環境変数で、ユーザーのホームディレクトリに展開される（`~` は展開されない）
- Linux/macOS/WSLでは shebang (`#!/usr/bin/env node`) により直接実行可能

#### パターン2: プロジェクト固有設定

**ファイル**: `<project-root>/.claude/settings.json`

**Linux/macOS/WSL**:
```json
{
  "hooks": {
    "Statusline": [
      {
        "type": "command",
        "command": "./.claude/hooks/statusline/statusline.js"
      }
    ]
  }
}
```

**Windows**:
```json
{
  "hooks": {
    "Statusline": [
      {
        "type": "command",
        "command": "node ./.claude/hooks/statusline/statusline.js"
      }
    ]
  }
}
```

**説明**:
- プロジェクトの `.claude/` にhookスクリプトを配置した場合に使用
- プロジェクトごとに異なるステータスライン表示を適用可能
- 相対パス `./.claude/` は現在の作業ディレクトリ（プロジェクトルート）から解釈される

### 3. OS判定とパス選択の自動化

Claude Codeに以下のように依頼すると、自動的に適切な設定を選択・適用できます:

```text
このREADME.mdを読んで、私の環境（OS、設定ファイルの場所）に合わせてstatusline hookをセットアップしてください。
```

Claude Codeは以下の手順で自動設定します:

1. **OS検出**: システム環境でOSを判定
2. **設定ファイル検索**:
   - グローバル設定: `~/.claude/settings.json` の存在確認
   - プロジェクト設定: `./.claude/settings.json` の存在確認
3. **パス決定**:
   - hookスクリプトの場所に応じて、グローバル（`~/`）またはプロジェクト（`./`）パスを選択
   - Windowsの場合は `node` プレフィックスを追加
4. **設定追加**: 適切な `command` パスで `Statusline` hookを追加

### 4. 手動設定の場合

自分で設定する場合は、以下のチェックリストを確認:

- [ ] hookスクリプトの場所を確認（`~/.claude/hooks/` または `<project>/.claude/hooks/`）
- [ ] OSを確認（Windows の場合は `node` プレフィックスが必要）
- [ ] 設定ファイルの場所を確認（グローバルまたはプロジェクト）
- [ ] 上記のパターン1または2から適切な設定をコピー
- [ ] `settings.json` に追記して保存
- [ ] **Claude Code セッションを再起動**（hook設定の反映に必須）

## カスタマイズ

`statusline.js` を編集することで、表示内容をカスタマイズできます:

### トークン数の表示形式を変更

```javascript
const formatTokenCount = (tokens) =>
  tokens >= 1000000
    ? `${(tokens / 1000000).toFixed(1)}M`
    : tokens >= 1000
      ? `${(tokens / 1000).toFixed(1)}K`
      : tokens.toString();
```

### 色の閾値を変更

```javascript
const percentageColor =
  percentage >= 90
    ? "\x1b[31m" // Red
    : percentage >= 70
      ? "\x1b[33m" // Yellow
      : "\x1b[32m"; // Green
```

### 表示フォーマットを変更

```javascript
const osEmoji = getPlatformEmoji();
return `${osEmoji} [${model}] 📁 ${currentDir} | 🪙 ${tokenDisplay} | ${percentageColor}${percentage}%\x1b[0m`;
```

## トラブルシューティング

### ステータスラインが表示されない

1. `settings.json` が正しく設定されているか確認
2. Claude Code セッションを再起動
3. `node` コマンドが利用可能か確認（`node --version`）

### パスエラーが発生する

- Windows: `%USERPROFILE%` が正しく使用されているか確認（`~` は展開されません）
- Linux/macOS/WSL: `~` または `./` が正しく使用されているか確認
- スクリプトファイルが実際に存在するか確認

### Node.jsがインストールされていない

Node.jsをインストールしてください:

- **Windows**: https://nodejs.org/ からインストーラーをダウンロード
- **Linux/macOS**: パッケージマネージャーを使用（例: `brew install node`, `apt install nodejs`）
- **WSL**: `sudo apt install nodejs npm`

## 技術詳細

### 入力形式

Statusline hookは標準入力からJSONデータを受け取ります:

```json
{
  "model": {
    "display_name": "Sonnet 4.5"
  },
  "workspace": {
    "current_dir": "/path/to/project"
  },
  "context_window": {
    "context_window_size": 200000,
    "current_usage": {
      "input_tokens": 45000,
      "cache_creation_input_tokens": 0,
      "cache_read_input_tokens": 0
    }
  }
}
```

### 出力形式

ANSIエスケープコードを使用して色付きテキストを標準出力に返します:

```
🪟 [Model] 📁 directory | 🪙 tokens | color%
```

先頭のOS絵文字は `process.platform` により自動検出されます。

### 使用率計算

```javascript
const percentage = Math.min(100, Math.round((currentTokens / contextSize) * 100));
```

コンテキストウィンドウの上限を基準として使用率を計算します。
