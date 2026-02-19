# Scaling

> [English](./scaling.md)

## 要件100個超えた場合の対策

### オプション1: **ハイブリッド構造**(推奨)

```
.reqord/
├── index.db                    # SQLite (検索・集計用)
├── requirements/
│   ├── req-001.json           # Git差分管理用(マスター)
│   └── req-001/
│       └── description.md
```

**仕組み:**

- JSON/Markdownが**真の情報源**(SSOT)
- SQLiteは**検索インデックス**(再生成可能)
- `reqord sync-db` でJSON→SQLite同期

**メリット:**

- Git差分は従来通り見える
- 大量データの検索・集計は高速
- SQLite削除しても再構築可能

### オプション2: **分割管理**

```
.reqord/
├── requirements/
│   ├── auth/          # ドメイン別
│   ├── payment/
│   └── reporting/
```

各ドメイン10-20個程度に抑える

---

## バグ発見・要求不足時のフロー

### 新しいエンティティ: **Feedback**

```
.reqord/
├── feedback/
│   ├── fb-001.json
│   └── fb-001/
│       ├── report.md
│       └── evidence/
│           └── screenshot.png
```

### Feedback構造

```typescript
{
  "id": "fb-001",
  "type": "bug" | "requirement-gap" | "spec-mismatch",
  "severity": "critical" | "high" | "medium" | "low",
  "

  // 紐付け
  "linkedTo": {
    "requirement": "req-001",
    "specification": "spec-001",
    "issue": 123
  },

  // 発見情報
  "discovered": {
    "phase": "implementation" | "review" | "testing" | "production",
    "discoveredAt": "2026-02-15T10:00:00Z",
    "discoveredBy": "@alice",
    "environment": "staging"
  },

  // 外部ファイル
  "files": {
    "report": "feedback/fb-001/report.md",
    "evidence": ["feedback/fb-001/evidence/screenshot.png"]
  },

  // 対応
  "resolution": {
    "status": "open" | "in-progress" | "resolved" | "wont-fix",
    "action": "requirement-update" | "spec-update" | "bug-fix" | "documentation",

    // 影響
    "impacts": {
      "requirementChanges": ["req-001"],
      "specificationChanges": ["spec-001"],
      "newIssues": [150, 151]
    },

    "resolvedAt": "2026-02-16T15:00:00Z",
    "resolvedBy": "@bob"
  }
}
```

### フロー図

```
実装完了
    ↓
レビュー/テスト
    ↓
問題発見！
    ↓
┌─────────────────┬──────────────────┬─────────────────┐
│ Bug             │ Requirement Gap  │ Spec Mismatch   │
│ (実装ミス)      │ (要件不足)       │ (設計ミス)      │
└────┬────────────┴────┬─────────────┴────┬────────────┘
     │                  │                   │
     ▼                  ▼                   ▼
Feedback作成       Feedback作成        Feedback作成
     │                  │                   │
     ▼                  ▼                   ▼
GitHub Issue修正   Requirement v1.1.0   Specification v1.1.0
     │             (新バージョン)        (新バージョン)
     │                  │                   │
     ▼                  ▼                   ▼
  完了              承認フロー           承認フロー
                        │                   │
                        ▼                   ▼
                    新Issue生成         既存Issue更新
```

### コマンド

```bash
# Feedback作成
reqord feedback create bug \
  --issue 123 \
  --spec spec-001 \
  --severity high \
  --description "Token validation fails for expired tokens"

# 証拠添付
reqord feedback attach fb-001 screenshot.png

# Feedback一覧
reqord feedback list --status open
reqord feedback list --spec spec-001

# 対応アクション
reqord feedback resolve fb-001 requirement-update
# → Requirement新バージョン作成を提案

reqord feedback resolve fb-002 bug-fix
# → 該当Issueに自動コメント

# 影響分析
reqord feedback impact fb-001
# → 影響を受けるReq/Spec/Issueを表示
```

### UI表示

```
┌─────────────────────────────────────────────────┐
│ Feedback: fb-001                    [Critical]  │
│ Type: Requirement Gap                           │
├─────────────────────────────────────────────────┤
│ Linked To:                                       │
│ - Requirement: req-001 v1.0.0                   │
│ - Specification: spec-001 v1.0.0                │
│ - Issue: #123 (closed)                          │
│                                                  │
│ Problem:                                         │
│ Token refresh機能が要件に含まれていなかった    │
│                                                  │
│ Evidence:                                        │
│ [screenshot.png] [error-log.txt]                │
│                                                  │
│ Suggested Actions:                               │
│ ⚪ Create req-001 v1.1.0                        │
│    - Add "Token refresh" requirement            │
│    - Trigger approval flow                      │
│                                                  │
│ ⚪ Update spec-001                              │
│    - Add refresh token design                   │
│                                                  │
│ ⚪ Create new issues                            │
│    - Implement refresh endpoint                 │
│    - Update token validation logic              │
│                                                  │
│ [Apply Suggestions] [Custom Action]             │
└─────────────────────────────────────────────────┘
```

### GitHub Issue連携

Feedbackから自動コメント:

```markdown
## 🔍 Feedback from Reqord

**Feedback ID:** fb-001
**Type:** Requirement Gap
**Severity:** High

### Problem

Token refresh functionality was missing from the original requirements.

### Impact

- Requirement req-001 needs update (v1.0.0 → v1.1.0)
- Specification spec-001 needs redesign
- New implementation issues will be created

### Actions Taken

- [ ] Created req-001 v1.1.0 (PR #160)
- [ ] Updated spec-001 (PR #161)
- [ ] Created implementation issues (#162, #163)

---

_Auto-generated by Reqord Feedback System_
```

これで**実装→発見→フィードバック→改善**のループが回ります！
