# Issue: scriptsディレクトリとhooks/analyticsの重複整理

## 概要

`.claude/scripts/` と `.claude/hooks/analytics/` に同じファイルが重複して存在しています。

## 重複ファイル

| scripts/ | hooks/analytics/ |
|----------|------------------|
| `analyze-custom-commands.js` | `analyze-custom-commands.js` |
| `generate-command-report.js` | `generate-command-report.js` |

## 現状

- `settings.json` の SessionEnd フックは `hooks/analytics/analyze-custom-commands.js` を参照
- `scripts/` 配下のファイルは未使用の可能性あり

## 提案

以下のいずれかの整理を検討：

1. **scripts/ を削除**: hooks/analytics/ に統一し、scripts/ の重複ファイルを削除
2. **構造変更**: hooks から呼び出すスクリプトを scripts/ に統一し、hooks/ は設定のみに

## 参考

```
.claude/
├── hooks/
│   └── analytics/
│       ├── analyze-custom-commands.js  ← settings.jsonから参照
│       └── generate-command-report.js
└── scripts/
    ├── analyze-custom-commands.js      ← 重複
    └── generate-command-report.js      ← 重複
```

---

**Note**: このファイルはGitHub issue作成の代替として作成されました。
トークン権限の制限によりAPIからのissue作成ができなかったため、
手動でissueを作成するか、このファイルを参照してください。
