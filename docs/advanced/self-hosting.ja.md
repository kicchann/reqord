# Self-hosting -- Reqordを使ってReqordを作る

> [English](./self-hosting.md)

Reqord自身の開発にReqordを使用するブートストラップ戦略（ドッグフーディング）について解説します。

## "Reqordを使ってReqordを作る" 戦略

### メリット

1. **自己検証** - 自分が使いながら作るので使い勝手が即座に分かる
2. **ドッグフーディング** - 実際の痛みポイントをリアルタイムで発見
3. **生きたドキュメント** - `.reqord/` 自体がベストプラクティス例
4. **段階的実装** - 必要最小限から始められる

---

## 🚀 ブートストラップ戦略

### Phase 0: 手動で `.reqord/` を作る

```bash
# まず手動でReqordプロジェクトの要件を作成
mkdir -p .reqord/{context,requirements,specifications,settings}

# 最初の要件を手書き
cat > .reqord/requirements/req-001.json << 'EOF'
{
  "id": "req-001",
  "title": "CLI基本コマンド",
  "status": "draft",
  ...
}
EOF

cat > .reqord/requirements/req-001/description.md << 'EOF'
# CLI基本コマンド

## 概要
reqord init, reqord req create など基本コマンドの実装
...
EOF
```

### Phase 1: 最小限のCLIを実装

**このフェーズで作るもの:**

```bash
# これだけ動けばOK
reqord init           # .reqord/構造を作成
reqord req create     # JSON/Markdown生成
reqord req list       # 一覧表示
```

**実装優先度:**

- ✅ ディレクトリ作成
- ✅ JSON読み書き
- ✅ Markdown読み書き
- ❌ AI機能(後回し)
- ❌ Web UI(後回し)
- ❌ GitHub連携(後回し)

### Phase 2: Reqordで自分の要件を管理

```bash
# Phase 1のCLIを使って、Phase 2の要件を作成
reqord req create "AI要件詳細化機能"
reqord req create "Specification CRUD"
reqord req create "GitHub Issue生成"

# 手動編集で詳細化
vim .reqord/requirements/req-002/description.md

# 依存関係を手動で設定
vim .reqord/requirements/req-002.json
# dependencies.blockedBy: ["req-001"]
```

### Phase 3: AI機能を追加

```bash
# Phase 2の要件を元に、AI機能を実装
# 実装したらすぐに自分の要件で試す

reqord req enhance req-004
# → AI が詳細化してくれる

# うまく動いたら、その結果を使って次の要件を作る
reqord req enhance req-005
```

### Phase 4: 以降も同じパターン

```
実装 → 自分のプロジェクトで使う → 改善点発見 → 実装
```

---

## 📋 具体的な初期 `.reqord/` 構造

### Reqordプロジェクト自身の要件例

```
.reqord/
├── context/
│   ├── context.json
│   ├── product.yaml              # "AIネイティブな要件管理ツール"
│   ├── technical.yaml            # "Node.js, TypeScript, Next.js"
│   └── structure.yaml            # "packages/ monorepo"
│
├── requirements/
│   ├── req-001.json            # CLI基本コマンド
│   ├── req-001/description.md
│   ├── req-002.json            # JSON/Markdown読み書き
│   ├── req-002/description.md
│   ├── req-003.json            # AI要件詳細化
│   ├── req-003/description.md
│   ├── req-004.json            # Specification CRUD
│   ├── req-005.json            # GitHub Issue生成
│   └── ...
│
├── specifications/
│   ├── spec-001.json           # CLI Architecture
│   ├── spec-001/
│   │   └── design.md
│   └── ...
│
└── settings/
    └── templates/
        └── requirement-description.md
```

### 最初の要件 (req-001)

```json
// .reqord/requirements/req-001.json
{
  "id": "req-001",
  "version": "1.0.0",
  "title": "CLI基本コマンド",
  "status": "draft",
  "priority": "high",
  "createdAt": "2026-02-07T10:00:00Z",
  "updatedAt": "2026-02-07T10:00:00Z",
  "versionHistory": [],
  "files": {
    "description": "requirements/req-001/description.md"
  },
  "successCriteria": [
    "reqord init でディレクトリ構造作成",
    "reqord req create でJSON+Markdown生成",
    "reqord req list で一覧表示"
  ],
  "format": {
    "type": "user-story",
    "userStory": {
      "as": "開発者",
      "iWant": "CLIで要件を管理したい",
      "soThat": "GUI不要で素早く要件追加できる"
    }
  },
  "dependencies": {},
  "estimatedComplexity": "small",
  "estimatedHours": 8
}
```

```markdown
<!-- .reqord/requirements/req-001/description.md -->

# CLI基本コマンド

## 概要

reqord CLI の基本機能を実装する。

## ユーザーストーリー

開発者として、CLIで要件を管理したい。
なぜなら、GUI不要で素早く要件追加できるから。

## 必要なコマンド

### reqord init

- `.reqord/` ディレクトリ構造作成
- 初期テンプレート配置

### reqord req create <title>

- JSON生成 (requirements/req-XXX.json)
- Markdown生成 (requirements/req-XXX/description.md)
- 自動採番

### reqord req list

- 要件一覧をテーブル表示
- status, priority でフィルタ可能

## 技術的制約

- Node.js 20+
- Commander.js使用
- TypeScript
```

---

## 🔄 開発サイクル

### Week 1

```bash
# 1. 手動で要件作成
vim .reqord/requirements/req-001.json

# 2. 最小CLIを実装
# packages/cli/src/commands/init.ts
# packages/cli/src/commands/req.ts

# 3. 動作確認
reqord init
reqord req create "AI要件詳細化"

# 4. うまくいった！
# → req-002以降はCLI使って作成
```

### Week 2

```bash
# 1. CLI使って次の要件作成
reqord req create "Specification CRUD"

# 2. 手動で詳細編集
vim .reqord/requirements/req-004/description.md

# 3. req-004を実装

# 4. 動作確認
reqord spec create req-001

# 5. うまくいった！
# → 以降、Specificationも管理可能に
```

### Week 3

```bash
# 1. AI機能の要件作成(CLI使用)
reqord req create "AI要件詳細化機能"

# 2. AI機能を実装

# 3. 自分の過去要件で試す
reqord req enhance req-005

# 4. めっちゃ便利！
# → 以降、AI使って要件作成加速
```

---

## ✅ この戦略の利点

1. **即座にフィードバック** - 作った機能をすぐ自分で使う
2. **優先順位が明確** - 本当に必要な機能から作れる
3. **バグ早期発見** - 実際の使用で問題が見つかる
4. **ドキュメント自動生成** - `.reqord/` がそのまま例になる
5. **モチベーション維持** - 自分が楽になるのが実感できる

---

## 🎯 最初の1週間でやること

```bash
# Day 1: 手動で基盤作成
mkdir -p .reqord/{context,requirements,specifications,settings}
# 最初の3-5要件を手書き

# Day 2-3: 最小CLI実装
# reqord init
# reqord req create
# reqord req list

# Day 4: 自分のCLIで要件追加
reqord req create "AI詳細化"
reqord req create "Spec CRUD"
reqord req create "Issue生成"

# Day 5: 次の機能実装開始
# 実装内容は自分が作った要件ベース！
```

この方法により、実際の使用感を開発にフィードバックしながら段階的にツールを改善できます。
