---
description: カバレッジレポートを表示する
argument-hint: "[test path]"
allowed-tools: Bash(pytest:*), Bash(coverage:*), Bash(npm:*), Bash(pnpm:*), Bash(go:*), Bash(cargo:*)
model: haiku
---

# カバレッジレポート

テストカバレッジを測定し、詳細レポートを表示します。

## 引数

- `$ARGUMENTS`: テストパスまたはオプション（オプション）

## 実行手順

### 1. カバレッジツール検出

プロジェクトの設定ファイルからカバレッジツールを自動検出:

| 検出ファイル | 言語 | カバレッジコマンド |
|-------------|------|------------------|
| `pyproject.toml`, `pytest.ini`, `.coveragerc` | Python | `pytest --cov` |
| `package.json` (vitest) | JavaScript/TypeScript | `npm run test -- --coverage` |
| `package.json` (jest) | JavaScript/TypeScript | `npm run test -- --coverage` |
| `go.mod` | Go | `go test -coverprofile` |
| `Cargo.toml` | Rust | `cargo tarpaulin` |

### 2. カバレッジ実行

**Python:**
```bash
pytest --cov --cov-report=term-missing $ARGUMENTS
# または coverage.py を使用
coverage run -m pytest $ARGUMENTS
coverage report -m
```

**JavaScript/TypeScript:**
```bash
npm run test -- --coverage $ARGUMENTS
# または pnpm
pnpm test --coverage $ARGUMENTS
```

**Go:**
```bash
go test -coverprofile=coverage.out ./... $ARGUMENTS
go tool cover -func=coverage.out
```

**Rust:**
```bash
cargo tarpaulin $ARGUMENTS
```

## 出力

- 全体カバレッジ率
- ファイルごとのカバレッジ
- カバーされていない行番号（Missing lines）

## 分析

カバレッジが低い箇所について:
- 重要度の評価
- テスト追加の提案

## 注意事項

- カバレッジツールが検出できない場合はその旨を報告
- Python: pytest-cov または coverage がない場合は報告
- `--cov-report=term-missing` で未カバー行を表示
- HTMLレポートが必要な場合は `--cov-report=html` を追加
