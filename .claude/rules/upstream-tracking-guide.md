---
paths: /never/match/folder/**
---

# 上流リソース追跡ガイド

## 目的

外部リソースを参照するスキルの更新管理を標準化し、最新の知見を継続的に取り込む仕組みを提供します。

## 適用ケース

### 1. 外部GitHubリポジトリを参照する場合

**例**: `apps/frontend/.claude/skills/react-best-practices/`
- Vercel Labs の agent-skills リポジトリを参照
- 定期的に上流の更新をチェック
- 変更があれば、プロジェクトへの適用可否を判断

### 2. 公式ドキュメントを参照する場合

**例**: Material-UI、React Query など
- 公式ドキュメントのバージョンを追跡
- API変更やベストプラクティスの更新を確認

### 3. 書籍・論文を参照する場合

**例**: `good-test-principles`（Khorikov の Unit Testing 書籍）
- 参照元の書籍情報を記録
- 改訂版が出た場合の更新フロー

### 4. プロジェクトオリジナルの場合

**例**: `clean-architecture`
- 上流リポジトリはないが、一貫性のために `.upstream-tracking.json` を配置
- `repository: null` で管理

## .upstream-tracking.json スキーマ

### 基本スキーマ（外部GitHubリポジトリを参照）

```json
{
  "repository": "organization/repository-name",
  "path": "path/to/resource",
  "currentCommit": "abc123...",
  "currentVersion": "1.0.0",
  "lastChecked": "2026-01-24",
  "nextCheckDue": "2026-02-24",
  "checkFrequencyDays": 30,
  "checkCommand": "bash scripts/check-upstream.sh",
  "upstreamUrl": "https://github.com/organization/repository-name/tree/main/path",
  "localModifications": [
    {
      "file": "resources/custom-addition.md",
      "reason": "プロジェクト固有の追加機能",
      "date": "2026-01-24"
    }
  ]
}
```

### 書籍・論文参照のスキーマ

```json
{
  "repository": null,
  "referenceBook": "Unit Testing Principles, Practices, and Patterns by Vladimir Khorikov",
  "isbn": "978-1617296277",
  "edition": "1st Edition (2020)",
  "currentVersion": "1.0.0 (based on book)",
  "lastChecked": "2026-01-24",
  "note": "このスキルは書籍を基にしたプロジェクト固有の実装です。上流リポジトリはありません。"
}
```

### プロジェクトオリジナルのスキーマ

```json
{
  "repository": null,
  "currentVersion": "1.0.0",
  "lastChecked": "2026-01-24",
  "note": "このスキルはプロジェクトオリジナルです。外部リポジトリは追跡していません。"
}
```

## フィールド定義

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `repository` | ✅ | GitHubリポジトリ（`org/repo` 形式）。ない場合は `null` |
| `path` | - | リポジトリ内のパス |
| `currentCommit` | - | 現在追跡しているコミットSHA |
| `currentVersion` | ✅ | スキルのバージョン |
| `lastChecked` | ✅ | 最終チェック日（YYYY-MM-DD） |
| `nextCheckDue` | - | 次回チェック予定日 |
| `checkFrequencyDays` | - | チェック頻度（日数） |
| `checkCommand` | - | 更新チェックコマンド |
| `upstreamUrl` | - | 上流リソースのURL |
| `localModifications` | - | ローカル変更の記録 |
| `referenceBook` | - | 参照書籍名 |
| `isbn` | - | 書籍ISBN |
| `edition` | - | 版情報 |
| `note` | - | 備考 |

## SKILL.md への追加

SKILL.md の YAML フロントマターに `upstream` フィールドを追加します。

### 外部リポジトリを参照する場合

```yaml
---
name: react-best-practices
description: |
  React/Next.js performance best practices curated by Vercel.
user-invocable: true
allowed-tools: [Read, WebFetch]
upstream:
  repository: vercel-labs/agent-skills
  path: skills/react-best-practices
  tracking: .upstream-tracking.json
---
```

### プロジェクトオリジナルの場合

```yaml
---
description: Clean Architecture principles...
allowed-tools: [Read, Grep, Glob, Edit, Write, Bash]
upstream:
  repository: null
  tracking: .upstream-tracking.json
  note: Project original, no upstream tracking
---
```

## ディレクトリ構造

```
skill-name/
├── SKILL.md                     # upstream フィールドを含む
├── .upstream-tracking.json      # 追跡情報
├── scripts/
│   └── check-upstream.sh        # 更新チェックスクリプト（外部参照の場合）
└── resources/
    ├── changelog.md             # 上流変更履歴（外部参照の場合）
    └── ...
```

## 更新チェックスクリプト

### 必須機能

1. **依存関係の柔軟な対応**: jq または python3
2. **GitHub API エラーハンドリング**: レート制限、認証エラー
3. **認証トークンサポート**: `GITHUB_TOKEN` 環境変数
4. **JSON検証**: 無効なファイル形式の検出

### 使用方法

```bash
# 更新確認
cd .claude/skills/skill-name/
bash scripts/check-upstream.sh

# 環境変数で認証（レート制限回避）
export GITHUB_TOKEN=your_token
bash scripts/check-upstream.sh
```

### テンプレート

`apps/frontend/.claude/skills/react-best-practices/scripts/check-upstream.sh` を参照してください。

## 更新ワークフロー

### 1. 定期的なチェック

```bash
# 月1回程度実行
bash scripts/check-upstream.sh
```

### 2. 更新がある場合

1. 差分URLで変更内容を確認
2. プロジェクトへの適用可否を判断
3. 必要なリソースファイルを更新
4. `changelog.md` に履歴を追記
5. `.upstream-tracking.json` を更新

### 3. 更新コマンド

スクリプトが表示する更新コマンドを実行:

```bash
# jq 使用時
jq --arg commit "new_commit_sha" --arg checked "$(date +%Y-%m-%d)" \
   '.currentCommit = $commit | .lastChecked = $checked' \
   .upstream-tracking.json > .upstream-tracking.json.tmp && \
mv .upstream-tracking.json.tmp .upstream-tracking.json

# python3 使用時
python3 -c "
import json
from datetime import date
with open('.upstream-tracking.json', 'r') as f:
    data = json.load(f)
data['currentCommit'] = 'new_commit_sha'
data['lastChecked'] = str(date.today())
with open('.upstream-tracking.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
"
```

## ベストプラクティス

### チェック頻度

- **アクティブなプロジェクト**: 月1回
- **安定版**: 四半期に1回
- **参照のみ**: 半年に1回

### ローカル変更の記録

プロジェクト固有の変更は `localModifications` に記録:

```json
"localModifications": [
  {
    "file": "resources/vite-applicability.md",
    "reason": "Vite環境への適用可否判定を追加",
    "date": "2026-01-24"
  }
]
```

### 変更履歴の管理

`resources/changelog.md` に標準フォーマットで記録:

```markdown
### YYYY-MM-DD: [タイトル]

**上流コミット**: abc123...

**変更内容**:
- [変更点1]
- [変更点2]

**適用可否への影響**:
- [プロジェクトへの影響]

**更新したファイル**:
- [ファイル1]
- [ファイル2]
```

## トラブルシューティング

### GitHub API レート制限

**症状**: `API rate limit exceeded` エラー

**対処**:
```bash
# Personal Access Token を作成
# https://github.com/settings/tokens

# 環境変数を設定
export GITHUB_TOKEN=your_token_here

# スクリプトを再実行
bash scripts/check-upstream.sh
```

### jq が未インストール

**症状**: スクリプトが python3 を使用

**推奨**: jq をインストール
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Windows (WSL)
sudo apt-get install jq
```

### JSON が破損

**症状**: `無効なJSON形式です` エラー

**対処**:
1. `.upstream-tracking.json` をバックアップ
2. JSON バリデーターで確認（https://jsonlint.com/）
3. 手動で修正または初期化

## まとめ

上流リソース追跡システムは、外部の知見を継続的に取り込むための標準化された仕組みです。

**主な利点**:
- 最新のベストプラクティスを常に反映
- 変更履歴の可視化
- プロジェクト固有のカスタマイズと上流の分離

**運用ポイント**:
- 定期的なチェックを習慣化
- 変更の影響範囲を慎重に評価
- ローカル変更を明確に記録
