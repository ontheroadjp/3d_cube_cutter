# workflow.md

Status: Active
Summary: Issue/PR 駆動の作業手順と命名規則を定義する。

## 目的
- 常に動く状態を維持しながら、変更履歴と意思決定を追えるようにする
- プロジェクト横断で同一の運用を適用する

## 基本方針
- 1 Issue = 1 ブランチ = 1 PR
- すべての作業は Issue から開始する
- 仕様/設計/移行の整合性を維持する
- 変更に応じてドキュメントとテストを更新する

## 新規実装開始の最小手順
1. Issue 作成（目的/完了条件/影響範囲/テスト観点を明記）
2. docs/CURRENT.md に進行中 Issue を追記
3. L2 plan / note を作成（`docs/technical/implementation/<topic>/`）
4. 参照すべき仕様/設計を Issue 本文に明記
5. Issue 専用ブランチを作成して実装開始

## Issue 運用
- Issue には「目的/完了条件/影響範囲/テスト観点/メモ」を明記する
- Issue タイトルは次のフォーマットに統一する
  - `#<issue番号> [<PREFIX>] <タイトル>`
- Issue は PR に紐づけて進行し、マージ時に自動クローズする
  - PR 本文に `Fixes #<issue>` / `Closes #<issue>` / `Refs #<issue>` を記載

### Issue prefix
- `[TASK]` 機能追加/改修の通常タスク
- `[REF]` リファクタ/構造整理/移行作業
- `[BUG]` 不具合修正
- `[DOC]` ドキュメント更新/整合性整理
- `[TEST]` テスト追加/改善
- `[CHORE]` ツール/CI/環境整備
- `[SPIKE]` 調査/検証/プロトタイプ

## ブランチ運用
- Issue 専用ブランチを作成して作業する
- ブランチ名は issue 番号を含める
  - 例: `docs/18-workflow-docs`, `ref/123-selection-snapid-state`

## PR 運用
- PR には「変更点/理由/テスト/影響」を明記する
- PR タイトルは Issue と同じフォーマットに統一する
  - `#<issue番号> [<PREFIX>] <タイトル>`
- 依存関係がある場合は PR 本文に `Depends on #<PR番号>` とチェックリストを記載する
- Issue は PR 作成後に進行中とし、マージ時にクローズする

### 例外ルール
- 1 Issue を複数 PR に分割してよい条件
  - 大規模変更、リスクが高い、レビュー負荷が大きい、段階リリースが必要
- 複数 Issue を 1 PR にまとめてよい条件（基本は禁止）
  - 同一目的の軽微なドキュメント修正のみ

### 追加依頼の扱い
- 軽微の定義: 影響範囲が限定的（1ファイル/数行）、挙動変更なし、テスト不要、ドキュメント整合のみ
- 上記以外は新しい Issue/PR とする

## コミット運用
- Conventional Commits 準拠（英語）
- 本文に変更理由/影響/テスト結果を記載
- Issue がある場合は `Refs #<issue>` を本文に記載

## PR タイトルとコミットの整合
- PR タイトルはワークフロー形式を維持し、最終コミットは Conventional Commits に統一する
- Squash merge を利用する場合、最終コミットメッセージを Conventional 形式で整える

## テスト運用
- PR 作成前: `npm run typecheck` 必須
- マージ前: `npm run typecheck` と `npm test` 必須
- 実行できない場合は PR に理由を明記する

## Definition of Done
- `npm run typecheck` が成功している
- `npm test` が成功している
- 主要ユースケースの手動確認（必要な場合）
- ドキュメント更新（必要な場合）
- 破壊的変更なら migration note / release note を追加

## ドキュメント運用
- 変更に応じてドキュメントを更新する
- 追加/更新時は `Status:` を付与する
- `docs/DOCS_INDEX.md` は `scripts/generate_docs_index.py` で更新する
- `docs/DOCS_INDEX.md` を参照する前に必ず生成スクリプトを実行する

## gh の本文改行
- `gh issue create` / `gh pr create` の本文は `\n` では改行されない
- 改行が必要な場合は `--body-file -` で標準入力を使う
