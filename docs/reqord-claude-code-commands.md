# Reqord用 Claude Code スラッシュコマンド

`.claude/commands/reqord/` に定義された、reqord固有のスラッシュコマンドです。

## /reqord:design

Specification設計書（design.md）を作成するコマンド。

```
/reqord:design <spec-id...|req-id...|--all>
```

**引数**: spec-id / req-id をスペース区切りで複数指定可。`--all` で未記述の全specを対象。引数なしの場合は対話的に選択。

**処理フロー**:

1. **対象Specificationの特定** - 引数に応じてspec一覧から対象を決定
2. **情報収集** - requirement情報、ProjectContext（product / technical / structure / domain）を並列で読み取り
3. **分割判断** - 1要件を複数spec（最大3件）に分割すべきか判断し、ユーザー承認を得る
4. **既存コード調査** - Exploreエージェントで関連コードの実装状況を調査
5. **design.md生成** - 6セクション構造（設計概要 / アーキテクチャ / コンポーネント設計 / データフロー / テスト方針 / 技術的決定事項）で生成。複数specは並列生成
6. **ユーザーレビュー・適用** - サマリー表示後、承認を得てファイルに書き込み
7. **検証** - `reqord spec list` / `reqord spec show` で確認

**design.mdの構造**:

```markdown
# [タイトル] - 技術設計書

## 1. 設計概要
## 2. アーキテクチャ
## 3. コンポーネント設計
## 4. データフロー
## 5. テスト方針
## 6. 技術的決定事項
```

**実装状況による書き分け**:

| 分類 | 判定基準 | design.mdの書き方 |
|------|----------|-------------------|
| 実装済み | コマンド・サービス・リポジトリが揃っている | 既存コードを参照して文書化 |
| 一部実装 | スキーマは定義済みだがコマンド未実装等 | 既存部分を文書化 + 未実装部分を設計 |
| 未実装 | 関連コードがない | ProjectContextとrequirementから設計を導出 |

**複雑度別の目安行数**: small: 60-120行 / medium: 120-250行 / large: 200-400行

---

## /reqord:refine

要件のSMART品質スコアを向上させるための詳細化コマンド。

```
/reqord:refine <req-id...>
```

**引数**: req-idをスペース区切りまたはカンマ区切りで複数指定可。引数なしの場合は対話的に選択。

**処理フロー**:

1. **対象要件の特定** - 引数またはインタラクティブ選択
2. **情報収集** - `reqord req show` / `reqord context show` / `reqord req list` を並列実行後、`reqord req validate` を実行
3. **ドメイン知識の読み込み** - `.reqord/context/domain/requirements-engineering.md`
4. **既存コード調査** - Exploreエージェントで関連コードの実装状況を調査
5. **分析** - 8つの観点（バリデーション結果、既存コード、曖昧表現、成功基準、SMART基準、依存関係、format、見積もり整合性）で分析
6. **改善案の提示** - 現状スコアサマリー + 要件ごとの改善案（パッチJSON、description.md変更）を提示し承認を得る
7. **更新の適用** - 承認後 `reqord req update` で適用
8. **改善確認** - 再バリデーションで改善前後のスコア比較テーブルを表示

**分析の8観点**:

1. バリデーション結果のissuesとSMARTスコアの低いディメンション
2. 既存コード実装状況との整合性
3. 曖昧表現 → 具体的な数値・条件・フォーマットへの置き換え
4. 成功基準の測定可能性・検証可能性（3-7件の範囲）
5. SMART基準の各ディメンション
6. 依存関係（blockedBy / blocks / relatedTo）の実態との整合
7. format（ユーザーストーリー / EARS）の各フィールドの具体性
8. estimatedComplexityとestimatedHoursの整合性
