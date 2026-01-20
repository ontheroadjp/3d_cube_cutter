# documentation_alignment

Status: Draft
Summary: docs/ の tech/education 分離と導線を、documentation_policy.md に合わせて整合させる計画。

## 目的
- tech/education 分離と L0–L4 を、現状ドキュメントへ適用して混在を解消する
- 入口（README/CURRENT）から迷わず参照できる導線を完成させる

## 完了条件
- technical に教育理由が混在しない（必要なら education へのリンクで接続）
- education に実装契約/詳細が混在しない（必要なら technical spec へのリンクで接続）
- 入口 `docs/README.md` / `docs/technical/README.md` / `docs/education/README.md` / `docs/CURRENT.md` が矛盾しない

## フェーズ
### Phase 1: 境界条件の整理
- `docs/technical/architecture/edu_engine_boundary.md` を「境界条件」へ縮約
- 統合版は `docs/legacy/` へ退避し、現行から参照できるようにする

### Phase 2: 教育ドキュメントの受け皿整備
- `docs/education/cut_patterns.md` を追加（教え方/強調方針）
- `docs/education/ui_policy.md` を最低限埋める（教育拡張の正を education 側へ移す）

### Phase 3: 技術契約の追加
- `docs/technical/specification/learning/explanation_generation_spec.md` を追加（解説生成の入出力契約）

### Phase 4: 混在の解消と導線更新
- `docs/education/explanation_templates.md` から実装寄り要素を externalize（spec 参照へ）
- `docs/technical/patterns/*` の教育要素を education へ委譲し、参照で接続
- 入口リンクを更新（必要な導線のみ追加）

## References
- docs/documentation_policy.md
- docs/workflow.md
- docs/CURRENT.md
