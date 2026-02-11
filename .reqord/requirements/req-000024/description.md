# Web UIからのCLIジョブ実行 (Agent API)

## 概要

Web UI (packages/web) のボタン操作からCLIコマンドをバックグラウンド実行し、承認依頼・仕様書生成・Issue作成のワークフローをブラウザ上で完結させる。

## ユーザーストーリー

開発者・レビュアーとして、Web UIのボタン操作だけでCLIの承認依頼やジョブ実行を行いたい。
なぜなら、ターミナルを開かずにブラウザ上で要件管理ワークフローを完結できるから。

## 背景・動機

現状のreqordでは、承認依頼（`reqord req approve`）やPR作成はCLI経由でのみ実行可能。Web UIは閲覧専用のViewerとして機能している。これをボタン操作で実行できるようにすることで、非エンジニアを含むチームメンバーも承認ワークフローに参加しやすくなる。

## アーキテクチャ

### 全体構成

```
ローカル開発時:
┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Web UI      │────→│  Agent       │────→│  CLI     │
│  :3000       │ API │  :3001       │exec │          │
│  (Next.js)   │←────│  (Hono)      │←────│  reqord  │
└──────────────┘ SSE └──────────────┘     └──────────┘

Vercel:
┌──────────────┐
│  Web UI      │  ← 純粋 Viewer（アクションボタン非表示）
│  (Next.js)   │
└──────────────┘
```

### パッケージ構成

- **packages/web** (既存): Next.js Viewer。環境変数 `NEXT_PUBLIC_AGENT_URL` が設定されている場合のみアクションボタンを表示。ローカル依存なし。
- **packages/agent** (新規): ローカル専用 API サーバー。CLIをchild_processで実行し、ジョブの状態管理と結果返却を行う。
- **packages/cli** (既存): `--json` オプションを追加し、構造化出力に対応。

### 環境切り替え

| 環境 | NEXT_PUBLIC_AGENT_URL | アクションボタン | データソース |
|------|----------------------|----------------|------------|
| ローカル開発 | `http://localhost:3001` | 表示 | ローカル .reqord/ |
| Vercel | 未設定 | 非表示 | ビルド時静的生成 or GitHub API |

## 機能要件

### Agent API (packages/agent)

#### POST /jobs
- ジョブを作成し、バックグラウンドでCLIコマンドを実行開始
- リクエスト: `{ type: "req-approve" | "spec-approve" | "spec-design" | ..., targetId: "req-000001" }`
- レスポンス: `{ jobId: "job-xxx", status: "running" }`

#### GET /jobs/:id
- ジョブの現在の状態を取得
- レスポンス: `{ jobId, status: "running" | "completed" | "failed", output: string[], result?: { prUrl?: string, ... } }`

### Job タイプ（初期実装）

| type | CLI コマンド | 説明 |
|------|------------|------|
| `req-approve` | `reqord req approve <id> --json` | 要件の承認依頼PR作成 |
| `spec-approve` | `reqord spec approve <id> --json` | 仕様の承認依頼PR作成 |

### Web UI 変更 (packages/web)

- RequirementDetail / SpecificationDetail ページに ActionBar コンポーネントを追加
- `NEXT_PUBLIC_AGENT_URL` 未設定時は ActionBar を非表示
- ジョブ実行中はプログレス表示、完了時は結果（PR URL）をリンク表示

### CLI 変更 (packages/cli)

- 承認コマンドに `--json` オプションを追加
- JSON出力時は `{ success: boolean, prUrl?: string, branch?: string, error?: string }` 形式

## 将来の拡張（本要件のスコープ外）

- `spec-design`: 仕様書生成ジョブ（Claude Code連携）
- `req-issue`: GitHub Issue生成ジョブ
- `validate`: バリデーションジョブ
- WebSocket/SSE による リアルタイム進捗ストリーミング
- Vercel環境でのデータソース切り替え（GitHub API経由）

## 技術的制約

- packages/web は Vercel デプロイ可能を維持する（child_process, fs書き込みを含めない）
- Agent API は完全にオプショナル。未起動でも Web UI は Viewer として正常動作する
- CLIの既存ロジックは変更最小限（--json オプション追加のみ）

## エッジケース

- Agent APIが起動しているがCLI未ビルドの場合 → ジョブ失敗として HTTP 500 とエラーメッセージ "CLI not found or not built" を返却
- 同一リソースに対する重複ジョブ実行 → 排他制御 or 警告表示
- ジョブ実行中にAgent APIがクラッシュ → フロントエンドでタイムアウト処理
- git操作中のコンフリクト → CLIのエラーをそのままフロントエンドに伝搬
