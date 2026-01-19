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

## Issue 運用
- Issue には「目的/完了条件/影響範囲/テスト観点/メモ」を明記する
- Issue タイトルは次のフォーマットに統一する
  - `#<issue番号> [<PREFIX>] <タイトル>`

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
- 例: `docs/workflow-docs-18`, `refactor/selection-snapid-state`

## PR 運用
- PR には「変更点/理由/テスト/影響」を明記する
- PR タイトルは Issue と同じフォーマットに統一する
  - `#<issue番号> [<PREFIX>] <タイトル>`
- 依存関係がある場合は PR 本文に `Depends on #<PR番号>` を記載する
- Issue は原則「クローズしてから PR を作成」する

## コミット運用
- Conventional Commits 準拠（英語）
- 本文に変更理由/影響/テスト結果を記載
- Issue がある場合は `Refs #<issue>` を本文に記載

## テスト運用
- `npm run typecheck` と `npm test` を適時実行する
- 実行できない場合は PR に理由を明記する

## ドキュメント運用
- 変更に応じてドキュメントを更新する
- 追加/更新時は `Status:` を付与する
- `docs/DOCS_INDEX.md` は `scripts/generate_docs_index.py` で更新する

## 追加依頼の扱い
- 既存 Issue の範囲を超える追加要求は、新しい Issue/PR とする
- 同一目的内の軽微な追加は、同一 PR に含めることを許容する

## gh の本文改行
- `gh issue create` / `gh pr create` の本文は `\n` では改行されない
- 改行が必要な場合は `--body-file -` で標準入力を使う
