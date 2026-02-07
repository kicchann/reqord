# PR: feat(hooks): CLIツール自動インストールと使用ガイドライン追加

**Branch:** `claude/add-cli-help-examples-feeSP`

## Summary

- リモートClaude Code環境でのCLIツール自動インストールスクリプトを追加
- 高速代替ツールと構造化抽出ツールの使用ガイドラインを整備
- CLAUDE.mdにCLIツールセクションを追加

## 追加されるツール

**高速代替ツール:**
- `rg` (ripgrep) - grep代替、10倍高速
- `fd` - find代替
- `sd` - sed代替、直感的な構文
- `fcp` - cp代替、並列処理
- `choose` - cut/awk代替
- `uv/uvx` - pip/venv代替

**構造化抽出ツール:**
- `jq` - JSONプロセッサ
- `mdq` - Markdownクエリ
- `ogrep` - インデント対応grep (YAML/Python)
- `rga` - PDF/Office/アーカイブ対応ripgrep

## 変更ファイル

| ファイル | 内容 |
|---------|------|
| `.claude/hooks/structured-cli-tools-setup.sh` | SessionStartフック、10ツールの自動インストール |
| `.claude/rules/structured-cli-tools-usage.md` | 使用ガイドライン、パイプ処理例、jqチートシート |
| `CLAUDE.md` | CLIツールセクション追加 |
| `.claude/settings.json` | フック設定追加 |
| `.claude/docs/issue-scripts-duplication.md` | scripts/ディレクトリ重複のissue記録 |

## Test plan

- [x] セットアップスクリプトの実行テスト
- [x] 各ツールの動作確認 (rg, fd, sd, jq, mdq, fcp, choose, rga, ogrep)
- [x] ドキュメントの整合性確認

---

**Note**: トークン権限の制限によりAPIからのPR作成ができませんでした。
GitHub UIから手動でPRを作成してください。

https://claude.ai/code/session_01TXPnTj8gsbEP7ab3YhmQ8M
