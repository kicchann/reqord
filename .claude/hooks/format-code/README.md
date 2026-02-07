# format-code hook

Write/Edit操作時に自動でファイルをフォーマットするPostToolUse hook。

> **Quick Setup**: Claude Codeに「このREADME.mdを読んでセットアップして」と伝えるだけで設定できます。

## ファイル構成

```text
.claude/hooks/format-code/
├── format-code.py         # メインスクリプト
├── settings.json.example  # フォーマッター設定テンプレート
├── hooks.json.example     # Claude Code hook設定例
├── README.md              # このファイル
└── test/
    └── test_format_code.py  # pytestテスト
```

## 機能

- **自動フォーマット**: Write/Edit操作時にファイルを自動フォーマット
- **拡張子ベース検出**: ファイル拡張子で適切なformatterを選択
- **Step順次実行**: format → lint fix のように複数Stepを順次実行
- **有効/無効切替**: `enabled`フラグで個別制御可能

## 対応フォーマッター

| 拡張子 | Step 1 (format) | Step 2 (lint fix) |
|--------|-----------------|-------------------|
| `.py`, `.pyi` | ruff format / black | ruff check --fix |
| `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs` | prettier | eslint --fix |
| `.json`, `.yaml`, `.yml` | prettier | — |
| `.sh`, `.bash` | shfmt | — |
| `.go` | gofmt | goimports |
| `.rs` | rustfmt | — |
| `.css`, `.scss`, `.less` | prettier | — |
| `.html`, `.htm` | prettier | — |
| `.md`, `.mdx` | 内蔵markdown formatter | — |

## セットアップ

### 1. hookスクリプトの配置確認

このREADME.mdがあるディレクトリに `format-code.py` と `settings.json` があることを確認してください。

### 2. settings.jsonの設定

**重要**: 設定ファイルの場所とOSに応じて、適切な `command` パスを選択してください。

#### パターン1: グローバル設定（ユーザーディレクトリ）

**ファイル**: `~/.claude/settings.json` または `C:\Users\<username>\.claude\settings.json`

**Linux/macOS**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/format-code/format-code.py",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**Windows**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "python %USERPROFILE%/.claude/hooks/format-code/format-code.py",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**説明**:
- `%USERPROFILE%/.claude/` にhookスクリプトを配置した場合に使用
- 全プロジェクトで共通のフォーマット設定を適用
- Windowsでは `.py` ファイルを直接実行できないため、`python` コマンドプレフィックスが必要
- `%USERPROFILE%` は Windows環境変数で、ユーザーのホームディレクトリに展開される（`~` は展開されない）

#### パターン2: プロジェクト固有設定

**ファイル**: `<project-root>/.claude/settings.json`

**Linux/macOS**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "./.claude/hooks/format-code/format-code.py",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**Windows**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "python ./.claude/hooks/format-code/format-code.py",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**説明**:
- プロジェクトの `.claude/` にhookスクリプトを配置した場合に使用
- プロジェクトごとに異なるフォーマット設定を適用可能
- 相対パス `./.claude/` は現在の作業ディレクトリ（プロジェクトルート）から解釈される

### 3. OS判定とパス選択の自動化

Claude Codeに以下のように依頼すると、自動的に適切な設定を選択・適用できます:

```text
このREADME.mdを読んで、私の環境（OS、設定ファイルの場所）に合わせてformat-code hookをセットアップしてください。
```

Claude Codeは以下の手順で自動設定します:

1. **OS検出**: `platform` モジュールまたはシステムコマンドでOSを判定
2. **設定ファイル検索**:
   - グローバル設定: `~/.claude/settings.json` の存在確認
   - プロジェクト設定: `./.claude/settings.json` の存在確認
3. **パス決定**:
   - hookスクリプトの場所に応じて、グローバル（`~/`）またはプロジェクト（`./`）パスを選択
   - Windowsの場合は `python` プレフィックスを追加
4. **設定追加**: 適切な `command` パスで `PostToolUse` hookを追加

### 4. 手動設定の場合

自分で設定する場合は、以下のチェックリストを確認:

- [ ] hookスクリプトの場所を確認（`~/.claude/hooks/` または `<project>/.claude/hooks/`）
- [ ] OSを確認（Windows の場合は `python` プレフィックスが必要）
- [ ] 設定ファイルの場所を確認（グローバルまたはプロジェクト）
- [ ] 上記のパターン1または2から適切な設定をコピー
- [ ] `settings.json` に追記して保存
- [ ] **Claude Code セッションを再起動**（hook設定の反映に必須）

## 設定

`settings.json.example`をコピーして`settings.json`を作成:

```bash
cp .claude/hooks/format-code/settings.json.example .claude/hooks/format-code/settings.json
```

`settings.json`でフォーマッターを設定:

```json
{
  "formatters": [
    {
      "extensions": [".py", ".pyi"],
      "commands": [
        ["ruff", "format", "{file}"],
        ["ruff", "check", "--fix", "{file}"]
      ],
      "install_hint": "pip install ruff  (or: pip install black)",
      "enabled": true
    }
  ]
}
```

- `extensions`: 対象の拡張子（複数指定可）
- `commands`: Step の配列。各 Step は代替コマンドの配列（`{file}`はファイルパスに置換）
  - **Step 間**: 順次実行（すべて実行。例: format → lint fix）
  - **Step 内**: フォールバック（最初に成功したコマンドで次の Step へ）
- `install_hint`: フォーマッター未インストール時に表示するインストール方法（オプション）
- `enabled`: 有効/無効の切り替え（デフォルト: true）
- 全 Step の全コマンドが未インストールの場合のみ、警告とインストール方法を表示

## エラー表示の仕組み

このhookは、フォーマッターが見つからない場合や実行エラーが発生した場合、**ユーザーとClaudeの両方にエラーメッセージを表示**します。

### Exit Codeとメッセージ表示

| Exit Code | 出力先 | 動作 |
|-----------|--------|------|
| 0 | stdout | 成功。メッセージはtranscriptに記録（Claudeには非表示） |
| 2 | stderr | ブロッキングエラー。**Claudeにフィードバックされ、ユーザーに表示** |

### エラーメッセージの例

**フォーマッター未インストール時**:
```bash
⚠️ FORMAT ERROR: Formatter not found for '.ts': prettier, eslint
   💡 Install: npm install -g prettier  (or: npm install -g eslint)
```

**スクリプト実行エラー時**:
```text
⚠️ FORMAT HOOK ERROR: Invalid JSON input
```

### 動作確認

フォーマッターがインストールされていないファイルを編集すると、自動的にエラーメッセージとインストール方法が表示されます。

## テスト実行

```bash
# Claude Codeから
/test .claude/hooks/format-code/test/ -v

# 直接実行
pytest .claude/hooks/format-code/test/ -v

# 手動テスト（コマンドライン）
echo '{"tool_input": {"file_path": "/path/to/file.py"}}' | python format-code.py
```


