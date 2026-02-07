#!/bin/bash

# JSON 入力を読み取る
input=$(cat)

# 一時ファイルを使用してJSONを安全にパース
tmpfile=$(mktemp)
echo "$input" > "$tmpfile"

# Python3 で JSON をパースしてコマンドとツール名を抽出
if command -v python3 &>/dev/null; then
  # Pythonでファイルから読み込み
  read -r tool_name < <(python3 -c "
import json
try:
    with open('$tmpfile') as f:
        data = json.load(f)
    print(data.get('tool_name', ''))
except:
    print('')
")
  read -r command < <(python3 -c "
import json
try:
    with open('$tmpfile') as f:
        data = json.load(f)
    print(data.get('tool_input', {}).get('command', ''))
except:
    print('')
")
elif command -v jq &>/dev/null; then
  command=$(jq -r '.tool_input.command' "$tmpfile" 2>/dev/null || echo "")
  tool_name=$(jq -r '.tool_name' "$tmpfile" 2>/dev/null || echo "")
else
  # jq も python3 もない場合は許可
  rm -f "$tmpfile"
  exit 0
fi

# 一時ファイルを削除
rm -f "$tmpfile"

# Bash コマンドのみをチェック
if [ "$tool_name" != "Bash" ]; then
  exit 0
fi

# 設定ファイルの候補リスト（すべて参照して統合）
# プロジェクトローカル → グローバルの順で、settings.json と settings.local.json の両方を参照
settings_files=(
  ".claude/settings.json"
  ".claude/settings.local.json"
  "$HOME/.claude/settings.json"
  "$HOME/.claude/settings.local.json"
)

# 単一ファイルから拒否パターンを取得（python3 または jq）
get_deny_patterns_from_file() {
  local file="$1"

  # ファイルが存在しない場合はスキップ
  [ ! -f "$file" ] && return

  if command -v python3 &>/dev/null; then
    python3 << PYEOF
import json

try:
    with open("$file") as f:
        data = json.load(f)

    deny_list = data.get("permissions", {}).get("deny", [])
    for item in deny_list:
        if item.startswith("Bash(") and item.endswith(")"):
            pattern = item[5:-1]
            print(pattern)
except Exception as e:
    pass
PYEOF
  elif command -v jq &>/dev/null; then
    jq -r '.permissions.deny[] | select(startswith("Bash(")) | gsub("^Bash\\("; "") | gsub("\\)$"; "")' "$file" 2>/dev/null
  fi
}

# すべての設定ファイルから拒否パターンを収集（重複除去）
collect_all_deny_patterns() {
  local patterns=""
  for file in "${settings_files[@]}"; do
    if [ -f "$file" ]; then
      local file_patterns
      file_patterns=$(get_deny_patterns_from_file "$file")
      if [ -n "$file_patterns" ]; then
        if [ -n "$patterns" ]; then
          patterns="$patterns"$'\n'"$file_patterns"
        else
          patterns="$file_patterns"
        fi
      fi
    fi
  done
  # 重複除去してソート
  echo "$patterns" | sort -u
}

deny_patterns=$(collect_all_deny_patterns)

# 設定ファイルが一つも見つからない場合は許可
if [ -z "$deny_patterns" ]; then
  exit 0
fi

# パターンを正規化する関数
# Claude Code形式: "git config:*" → glob形式: "git config *"
normalize_pattern() {
  local pattern="$1"
  # ":*" を " *" に変換（引数ワイルドカード）
  pattern="${pattern//:*/ *}"
  echo "$pattern"
}

# コマンドが拒否パターンにマッチするかチェックする関数
matches_deny_pattern() {
  local cmd="$1"
  local pattern="$2"

  # 先頭・末尾の空白を削除
  cmd="${cmd#"${cmd%%[![:space:]]*}"}"
  cmd="${cmd%"${cmd##*[![:space:]]}"}"

  # パターンを正規化
  pattern=$(normalize_pattern "$pattern")

  # glob パターンマッチング（ワイルドカード対応）
  [[ "$cmd" == $pattern ]]
}

# まずコマンド全体をチェック
while IFS= read -r pattern; do
  # 空行をスキップ
  [ -z "$pattern" ] && continue

  # コマンド全体がパターンにマッチするかチェック
  if matches_deny_pattern "$command" "$pattern"; then
    echo "Error: コマンドが拒否されました: '$command' (パターン: '$pattern')" >&2
    exit 2
  fi
done <<<"$deny_patterns"

# コマンドを論理演算子で分割し、各部分もチェック
# セミコロン、&& と || で分割（パイプ | と単一 & は分割しない）
temp_command="${command//;/$'\n'}"
temp_command="${temp_command//&&/$'\n'}"
temp_command="${temp_command//\|\|/$'\n'}"

IFS=$'\n'
for cmd_part in $temp_command; do
  # 空の部分をスキップ
  [ -z "$(echo "$cmd_part" | tr -d '[:space:]')" ] && continue

  # 各拒否パターンに対してチェック
  while IFS= read -r pattern; do
    # 空行をスキップ
    [ -z "$pattern" ] && continue

    # このコマンド部分がパターンにマッチするかチェック
    if matches_deny_pattern "$cmd_part" "$pattern"; then
      echo "Error: コマンドが拒否されました: '$cmd_part' (パターン: '$pattern')" >&2
      exit 2
    fi
  done <<<"$deny_patterns"
done

# コマンドを許可
exit 0
