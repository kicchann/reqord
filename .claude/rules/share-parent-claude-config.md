---
paths: /never/match/folder/**
---

# 親ディレクトリの .claude/ 設定を子ディレクトリで共有する方法

モノレポ構成で、ワークスペースルートの `.claude/` 設定（agents, commands, hooks, rules, skills）を
各アプリディレクトリで使えるようにする手順。

## スクリプトで一発設定

ワークスペースルートから実行:

```bash
.claude/scripts/link-parent-claude.sh apps/frontend
.claude/scripts/link-parent-claude.sh apps/backend-billing
```

これだけで完了。以下は仕組みの説明。

---

## 前提

```
root/                            # ワークスペースルート
├── .claude/
│   ├── agents/
│   ├── commands/
│   ├── hooks/
│   ├── rules/
│   ├── scripts/
│   │   └── link-parent-claude.sh  # このスクリプト
│   └── skills/
└── apps/
    ├── backend/.claude/         # ここから親を参照したい
    ├── frontend/.claude/
    └── backend-billing/.claude/
```

## 方針

- ディレクトリ全体をリンクするのではなく、各ファイル/サブディレクトリ単位でリンク
- これにより親の共通設定とアプリ固有の設定が共存できる

## スクリプトの動作

| ディレクトリ | 動作 |
|-------------|------|
| agents | 全てリンク（上書き） |
| commands | 既存ファイルは保持、なければリンク |
| hooks | 全てリンク（上書き） |
| rules | 既存ファイルは保持、なければリンク |
| skills | 既存ディレクトリは保持、なければリンク |

## 注意点（手動でやる場合）

**相対パスの階層に注意**

リンクファイルが置かれる場所から見た相対パスで指定する。

```
apps/backend/.claude/commands/implement.md  # リンクファイルの場所
                     ↓
../../../../.claude/commands/implement.md   # ここから見た親のパス
```

`apps/backend/.claude/` からではなく、`apps/backend/.claude/commands/` から見るので +1 階層深くなる。

## 関連

- CLAUDE.md の継承: 親の CLAUDE.md は自動的に読み込まれる（リンク不要）
- 公式ドキュメント: `.claude/rules/` のシンボリックリンクは公式サポート
- `.claude/skills/`, `.claude/agents/` のシンボリックリンクは公式ドキュメントに明記なし（動作確認済み）
