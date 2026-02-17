# フィードバックワークフロー

## 基本原則

**GitHub Issueがシングルソースオブトゥルース（SSoT）**。`.reqord/feedback/index.yaml` はGitHub Issueへの軽量インデックスに過ぎない。Reqordはフィードバックの後付け分析・構造化ツールであり、必須ではない。

## 3段階進化モデル

フィードバックは最初から完璧に構造化しない。段階的に進化させる。

### Stage 1: 初期報告（シンプル）

普通のGitHub Issueとして報告する。Reqordは関与しない。

```markdown
Title: Login fails after 1 hour

## What happened
After logging in, I get 401 error after about 1 hour.

## How to reproduce
1. Login
2. Wait 1 hour
3. Try to access /api/profile
4. Error
```

この時点で分かること: 現象のみ。原因・影響範囲・関連Requirement/Specは不明。

### Stage 2: 調査・議論（コメント）

Issueのコメントでチームが調査・議論する。

```markdown
# Comment by @developer
調査しました。JWTトークンのexpiryが1時間で、
refresh tokenの仕組みが実装されていないのが原因です。

# Comment by @reviewer
req-005の成功基準を確認したところ、
「トークンリフレッシュ機能」の記載がありませんでした。
これは要件の不足です。
```

### Stage 3: 整理・構造化（必要な場合のみ）

調査が進み、構造化が有益と判断してからReqordに取り込む。

```markdown
Title: [FEEDBACK] Token refresh mechanism missing

<!-- reqord:feedback
{
  "type": "requirement-gap",
  "linkedTo": {
    "requirement": "req-005",
    "specification": "spec-005"
  }
}
-->

## Investigation Result
**Root cause:** JWT token expires after 1 hour, no refresh mechanism

## Action Items
- [ ] Update req-005 (add refresh criteria)
- [ ] Update spec-005 design (add refresh flow)
- [ ] Implement refresh mechanism (#124)
```

## HTMLコメントメタデータ

Issue body内の `<!-- reqord:feedback {...} -->` が唯一のメタデータ伝達方式。GitHubラベルはメタデータ管理には使用しない。

## フィードバックの種別

| type | 意味 |
|------|------|
| `bug` | バグ報告 |
| `requirement-gap` | 要件の不足・欠落 |
| `spec-mismatch` | 仕様と実装の不一致 |
| `improvement` | 改善提案 |
| `security` | セキュリティ関連 |

## CLI サポート

### 段階的コマンド

```bash
# Stage 1: 普通にGitHub Issueを作る（Reqord不使用）

# Stage 2: 調査後の同期・分析
reqord feedback sync                     # GitHub Issueから取り込み
reqord feedback show <issue-number>      # 詳細表示

# Stage 3: 構造化・リンク
reqord feedback link <issue-number> \
  --type <type> --severity <severity> \
  --req <req-id>                         # reqにリンク
reqord feedback close <issue-number>     # クローズ
reqord feedback resolve <artifact-id> \
  --issue <issue-number>                 # フラグ解消
```

## 段階的構造化の原則

- **無理に構造化しない**: 情報が不十分な段階での構造化は無駄になりやすい
- **調査後に判断**: 構造化が有益と判断してからReqordに取り込む
- **GitHub Issue中心**: 詳細は全てGitHub Issueに。`.reqord/feedback/` は軽量インデックスのみ
