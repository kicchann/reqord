# npm パッケージ化 設計議論

**日時**: 2026-02-20
**形式**: 技術検討ディスカッション

---

## 背景

reqord を npm パッケージとして公開するにあたり、`reqord ui` コマンドで Web UI をローカル起動する機能の同梱方法を含めた設計方針を議論した。

---

## 現状のパッケージ構成

```
reqord (monorepo, pnpm workspaces)
├── packages/cli/      → @reqord/cli   （CLI ツール、bin あり）
├── packages/shared/   → @reqord/shared（スキーマ・型・ユーティリティ）
└── packages/web/      → @reqord/web   （Next.js 15 ダッシュボード、private）
```

---

## 決定事項

### 1. パッケージ分離方式を採用（案1）

```
npm i -g @reqord/cli     # CLI 本体（軽量）
npm i -D @reqord/web     # Web UI（オプション）
```

**理由**:
- @reqord/cli 単体は軽量（commander, chalk, cli-table3, js-yaml, zod のみ、数MB程度）
- Web UI（Next.js 15）を同梱すると数十MB になり、CLI だけ使いたいユーザーに不利
- Zenn CLI は 13.3MB だが、rspack で全依存を 0 にバンドルするという特殊なアプローチ。reqord は分離方式のほうが現実的

### 2. Next.js の選定は維持

**理由**:
- 将来の公開 Viewer として Vercel デプロイや GitHub Pages（`output: 'export'`）に活用できる
- ステークホルダーへの説明用途など、ローカル以外の展開も視野に入れている
- req-000024（Agent API）の設計と整合する

### 3. reqord ui コマンドの動作方針

- `@reqord/web` がインストールされていない場合、インストール案内のエラーメッセージを表示
- Web 起動パスを monorepo 相対パスから `require.resolve` 方式に変更が必要

```ts
// 現状（monorepo 前提）
const webDir = path.resolve(__dirname, "../../../web");

// npm パッケージ化後
const webDir = path.dirname(require.resolve("@reqord/web/package.json"));
```

### 4. REQORD_ROOT 環境変数について

- `REQORD_ROOT` は Web 専用の仕組み。CLI が `reqord ui` で Web を起動する際に子プロセスの環境変数として自動設定する
- CLI の他のコマンド（`reqord spec approve` 等）は `process.cwd()` を直接使用しており、`REQORD_ROOT` には依存しない
- npm パッケージ化しても現行の仕組みで問題なし

---

## Web UI の編集機能との整合性

### 現状

`@reqord/web` は Server Actions（`actions.ts`）で `node:fs/promises` を使い、YAML/Markdown を直接読み書きしている。

### 課題

- ローカル（`reqord ui`）では問題なし
- Vercel デプロイ時は書き込み系 Server Action が動かない

### 段階的な移行方針

| Phase | 内容 |
|-------|------|
| Phase 1 | npm パッケージ化（現状の fs 直接書き込みのまま）。ローカル `reqord ui` で完全動作 |
| Phase 2 | req-000024 実装時に Agent API を導入。書き込み系を Agent API 経由に移行し、Web から `node:fs` の書き込みを除去。Vercel デプロイ安全化 |

### req-000024 との整合

```
ローカル:
  Web UI → Agent API (Hono, :3001) → CLI (child_process) → fs

Vercel:
  Web UI → 純粋 Viewer（アクションボタン非表示）
```

- `NEXT_PUBLIC_AGENT_URL` 環境変数の有無で機能が切り替わる設計
- Web が CLI に直接依存しないため、パッケージ分離と矛盾しない

---

## i18n について

- 現状は i18n の仕組みなし。CLI メッセージは日本語ハードコード
- npm パッケージ公開にあたりメッセージ言語の統一が必要
- 優先度は低め。先にパッケージ化を進め、言語方針は別途決定

---

## 公開手順の概要

1. npm アカウント・スコープの準備
2. `package.json` の調整（name, version, engines, repository, keywords, license 等）
3. ビルドパイプラインの整備（shared → cli → web の順序）
4. `reqord ui` コマンドの修正（Web 起動パスの解決、未インストール時ガード）
5. `npm pack` でローカル検証
6. `npm publish --access public`

---

## 参考

- [zenn-cli (npm)](https://www.npmjs.com/package/zenn-cli) - 13.3MB、rspack で依存 0 にバンドル
- [zenn-editor (GitHub)](https://github.com/zenn-dev/zenn-editor) - 軽量サーバー + ビルド済み React の構成
