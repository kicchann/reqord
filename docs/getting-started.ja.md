# Getting Started

> [English](./getting-started.md)

Reqordをインストールして、プロジェクトの要件管理を始めましょう。

## Prerequisites

- Node.js 20+
- Git

## Install

```bash
npm install -g @reqord/cli
```

## Initialize a project

```bash
cd /path/to/your/project

# .reqord/ ディレクトリ構造を作成
reqord init

# プロジェクトコンテキストを設定
reqord context init
```

`reqord init` を実行すると、プロジェクトルートに以下の構造が生成されます:

```
.reqord/
├── context/          # プロジェクトコンテキスト
│   ├── context.yaml
│   ├── product.yaml
│   ├── technical.yaml
│   └── domain/
├── requirements/     # 要件データ
├── specifications/   # 仕様データ
└── settings/         # テンプレート・ルール
```

## Create your first requirement

```bash
# 対話形式で要件を作成（EARS / User Story / Free-form 形式を選択可能）
reqord req create

# 作成した要件を一覧表示
reqord req list

# 要件の詳細を確認
reqord req show req-000001
```

## Validate quality

```bash
# SMART基準で要件の品質をスコアリング
reqord req validate req-000001
```

SMARTバリデーションが曖昧な記述を検出し、改善のガイダンスを提示します。

## Create a specification

要件が定まったら、仕様（どう実装するか）を作成します:

```bash
# 要件に紐づく仕様を作成
reqord spec create req-000001

# 設計ドキュメントを確認
reqord spec design spec-000001
```

## Launch the dashboard

Web UIで要件の状態や依存関係を可視化できます:

```bash
reqord ui
```

ブラウザで `http://localhost:3000` が開き、プロジェクトヘルスメトリクス、依存グラフ、仕様詳細などを確認できます。

## Next steps

- [Requirements Guide](./guide-requirements.ja.md) -- 要件の書き方・粒度・形式
- [CLI Reference](./cli-reference.ja.md) -- 全コマンド一覧
- [About Reqord](./about/index.ja.md) -- 設計思想と理論的背景
