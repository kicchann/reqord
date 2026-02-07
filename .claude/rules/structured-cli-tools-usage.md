---
paths:
  - "**/*"
---

# CLIツール使用ガイドライン

高速代替ツールと構造化抽出ツールを活用し、効率的なデータ処理を行う。

## 高速代替ツールの優先使用

標準ツールより高速な代替ツールを優先すること：

| 用途 | 使う | 使わない |
|------|------|----------|
| テキスト検索 | `rg "pattern"` | `grep -r "pattern"` |
| ファイル検索 | `fd "\.ts$"` | `find . -name "*.ts"` |
| テキスト置換 | `sd "old" "new" file` | `sed -i 's/old/new/g' file` |
| ファイルコピー | `fcp -r src/ dst/` | `cp -r src/ dst/` |
| フィールド抽出 | `choose 0 2` | `cut -f1,3` / `awk '{print $1,$3}'` |
| Python実行 | `uvx ruff check .` | `pip install ruff && ruff check .` |

## 構造化出力と効率的な抽出

生データではなく、構造化ツールで必要な情報のみ抽出すること：

| データ形式 | ツール | 例 |
|-----------|--------|-----|
| JSON | `jq` | `jq '.items[].name' data.json` |
| YAML/TOML/XML | `yq` | `yq '.spec.containers[].image' deploy.yaml` |
| HTML | `htmlq` | `htmlq 'a' --attribute href < page.html` |
| Markdown | `mdq` | `mdq '# 見出し' < README.md` |
| CSV (SQL) | `csvq` | `csvq "SELECT name FROM data.csv WHERE age > 20"` |
| CSV (フィールド) | `choose` | `choose 0 2 < data.csv` |
| PDF/Office | `rga` | `rga "keyword" docs/` |

## パイプ処理パターン

### 検索結果の構造化

```bash
# rg --json で検索結果をJSON化し、jqで抽出
rg --json "TODO" src/ | jq -s '[.[] | select(.type=="match") | {
  file: .data.path.text,
  line: .data.line_number,
  text: .data.lines.text
}]'
```

### ファイル一覧の構造化

```bash
# fd + jq でファイル一覧をJSON配列に
fd -e md | jq -R -s 'split("\n") | map(select(. != ""))'

# カテゴリ別に集計
fd -e md .claude/commands/ | jq -R -s '
  split("\n") | map(select(. != "")) |
  map(split("/") | {dir: .[-2], file: .[-1]}) |
  group_by(.dir) | map({dir: .[0].dir, count: length})
'
```

### HTML抽出

```bash
# リンクのhref属性を抽出
curl -s https://example.com | htmlq 'a' --attribute href

# 特定クラスのテキスト抽出
htmlq '.content p' --text < page.html

# テーブルデータ抽出
htmlq 'table tr td' --text < data.html
```

### Markdown抽出

```bash
# 特定セクションを抽出
mdq '# API' < README.md

# コードブロックのみ抽出
mdq '```bash' < README.md
```

### YAML/TOML/XML抽出 (yq)

```bash
# YAML値の抽出
yq '.database.host' config.yaml

# 配列からの抽出
yq '.spec.containers[].image' deployment.yaml

# TOML処理
yq -p toml '.dependencies' Cargo.toml

# XML処理
yq -p xml '.project.dependencies.dependency[].artifactId' pom.xml

# 形式変換（YAML→JSON）
yq -o json '.' config.yaml
```

### CSV SQL処理 (csvq)

```bash
# 基本クエリ
csvq "SELECT name, age FROM users.csv WHERE age > 20"

# 集計

csvq "SELECT department, COUNT(*) FROM employees.csv GROUP BY department"

# 複数ファイル結合

csvq "SELECT * FROM users.csv u JOIN orders.csv o ON u.id = o.user_id"

### 設定ファイル分析

```bash
# jqで設定を分析
jq '{
  hooks: (.hooks | keys),
  allowed_count: (.permissions.allow | length),
  denied_count: (.permissions.deny | length)
}' .claude/settings.json
```

## ツール組み合わせのチートシート

| パターン | 用途 |
|---------|------|
| `jq '.path'` | JSON値抽出 |
| `yq '.path'` | YAML/TOML/XML値抽出 |
| `yq -o json` | YAML→JSON変換 |
| `htmlq 'selector'` | HTML要素抽出 |
| `csvq "SELECT..."` | CSV SQL集計 |
| `choose 0 2` | CSVフィールド選択 |
| `rg --json \| jq` | 検索結果構造化 |
| `fd \| jq -R -s` | ファイルリスト→JSON |
| `rg --json \| jq` | 検索結果 → 構造化データ |
| `mdq \| jq -R -s` | Markdown → JSON |
| `fd \| xargs sd` | 複数ファイル一括置換 |
| `jq 'group_by(.x)'` | データのグループ化・集計 |

## 参考

- インストールスクリプト: `.claude/hooks/structured-cli-tools-setup.sh`
- [バイブコーディングするならこれ入れとけ！なCLI](https://dev.sin5d.com/バイブコーディングするならこれ入れとけ！なcli/)
