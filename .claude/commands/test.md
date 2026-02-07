---
description: テストを実行する
argument-hint: "[test path or options]"
model: haiku
allowed-tools: Bash(pytest:*), Bash(python3:*), Bash(npm:*), Bash(pnpm:*), Bash(go:*), Bash(cargo:*)
---

# テスト実行

プロジェクトのテストを実行し、結果を表示します。

## 引数

- `$ARGUMENTS`: テストパスまたはオプション（オプション）

## 実行手順

### 1. テストフレームワーク検出

プロジェクトの設定ファイルからテストフレームワークを自動検出:

| 検出ファイル | 言語 | テストコマンド |
|-------------|------|--------------|
| `pyproject.toml`, `pytest.ini`, `setup.py` | Python | `pytest` |
| `package.json` (vitest) | JavaScript/TypeScript | `npm run test` または `pnpm test` |
| `package.json` (jest) | JavaScript/TypeScript | `npm run test` または `pnpm test` |
| `go.mod` | Go | `go test ./...` |
| `Cargo.toml` | Rust | `cargo test` |

### 2. テスト実行

検出されたフレームワークでテストを実行:

**Python:**
```bash
pytest $ARGUMENTS --tb=short
# または
python3 -m pytest $ARGUMENTS --tb=short
```

**JavaScript/TypeScript:**
```bash
npm run test $ARGUMENTS
# または pnpm がある場合
pnpm test $ARGUMENTS
```

**Go:**
```bash
go test ./... $ARGUMENTS
```

**Rust:**
```bash
cargo test $ARGUMENTS
```

## 出力

- テスト結果サマリー
- 失敗したテストの詳細
- 失敗時は原因分析と対処提案

## 失敗時の対処

テストが失敗した場合:
1. エラーメッセージを分析
2. 原因を特定
3. 修正方法を提案

## 注意事項

- テストフレームワークが検出できない場合はその旨を報告
- Python: pytestが見つからない場合は `uv run pytest` を試す
- Node.js: package.json の scripts.test を確認
