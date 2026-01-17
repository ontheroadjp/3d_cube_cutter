# DOCS_INDEX

ドキュメント一覧（Status/作成日/更新日）。日付は git log に基づきます。

| Path | Status | Description | Created (ISO) | Updated (ISO) |
| --- | --- | --- | --- | --- |
| `docs/README.md` | Active | 本プロジェクトは、中学受験算数向けの教育ツールとして、立方体・直方体の切断操作をシミュレーションするウェブアプリケーションです。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/architecture/design_principles.md` | Active | この文書では、現行の 3d_cube_cutter プロジェクトを **構造主体アーキテクチャ (Structure-First Architecture)** に移行する際の基本設計原則をまとめます。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/architecture/education_engine_integrated_design.md` | Active | 本ドキュメントは、 | - | - |
| `docs/architecture/engine_ui_contract.md` | Draft | UI（React）と Engine（Three.js/構造主体ロジック）を分離し、 | - | - |
| `docs/architecture/snap_point_id_naming.md` | Active | 本ドキュメントは、立体切断シミュレーターにおいて | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/architecture/snap_point_id_parsing.md` | Active | SnapPointID を安全に扱うため、文字列 → 構造化データへの変換規則と正規化規則を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/architecture/snap_point_id_spec.md` | Active | SnapPointID は、立方体・直方体上のすべての切断点（ユーザー選択点、交点、プリセット点）を一意に識別するためのIDです。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/architecture/structure_first_overview.md` | Active | この文書では、構造主体アーキテクチャに基づき、立方体（直方体）および切断点管理のための主要構造オブジェクトを定義します。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/architecture/structure_model_spec.md` | Active | 構造主体アーキテクチャにおける Vertex / Edge / Face / SnapPoint のデータ仕様を定義し、 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/architecture/ui_layer_design.md` | Draft | - Three.js の描画ロジックと UI 層を分離し、学習機能の拡張に耐える構造にする | - | - |
| `docs/architecture/vertex_labeling_spec.md` | Active | ユーザーが頂点ラベルを自由に指定できるようにしつつ、 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/education/explanation_templates.md` | Active | 本テンプレートの上位方針は `docs/architecture/education_engine_integrated_design.md` に準拠する。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/education/mobile_ui_policy.md` | Active | タブレット/スマホで快適に操作できるよう、 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/implementation_notes.md` | Draft | 現行実装の挙動を把握しつつ、構造主体アーキテクチャへ安全に移行するための | 2026-01-17T07:32:40+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/legacy/v0.0.1/implementation_notes.md` | Legacy | このドキュメントは、`立体切断シミュレーター`の内部実装に関する技術的な詳細と、新たな機能追加や修正を行う開発者向けのガイドラインを記載します。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/legacy/v0.0.1/specification.md` | Legacy | 本プロジェクトは、中学受験算数の重要かつ難関単元である「立体切断（立方体・直方体の切断）」を、Webブラウザ上で直感的に学習できるシミュレーターです。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/migration/architecture_migration_plan.md` | Superseded | 置き換え先: `docs/migration/structure_first_migration_plan.md` | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/migration/implementation_checklist.md` | Superseded | 構造主体移行は完了済み。本チェックリストは記録用。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/migration/react_ui_migration_plan.md` | Active | - 学習機能の拡張に備え、UI層をReactへ段階移行する | - | - |
| `docs/migration/step0_current_architecture.md` | Legacy | 構造主体移行の前提として、現行実装の責務とフローを整理する。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/migration/structure_first_migration_plan.md` | Superseded | 置き換え先: `docs/migration/implementation_checklist.md` | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/migration/typescript_migration_plan.md` | Superseded | 移行は完了済み。本ドキュメントは記録用。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/patterns/frequent_patterns.md` | Active | 本ファイルの上位方針は `docs/architecture/education_engine_integrated_design.md` に準拠する。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/patterns/frequent_patterns_snapid.md` | Active | 本ドキュメントの上位方針は `docs/architecture/education_engine_integrated_design.md` に準拠する。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/presets/preset_snapid_notes.md` | Active | SnapPointID を使ったプリセット切断パターンを `PresetManager` / `presetData.js` で扱う際の注意点とベストプラクティスを整理します。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/presets/preset_snapid_usage.md` | Active | 本ドキュメントでは、Cutter モジュールの新しい構造主体アーキテクチャに基づき、 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/presets/preset_unification_policy.md` | Active | 標準プリセットとユーザープリセットを同列に扱い、 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/presets/user_preset_state_spec.md` | Active | 切断点や頂点ラベルなどの直方体状態を、 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/specs/cutter/cut_result_builder_spec.md` | Active | docs/specs/cutter/cut_result_builder_spec.md | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/specs/cutter/cut_result_schema.md` | Active | 切断処理の結果を構造情報として保持し、 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/specs/cutter/cutter_module_spec.md` | Active | docs/specs/cutter/cutter_module_spec.md | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/specs/cutter/cutter_spec.md` | Active | Cutter モジュールは、3D立方体の切断処理を担当するコアコンポーネントです。 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/specs/cutter/intersection_calculator_spec.md` | Active | docs/specs/cutter/intersection_calculator_spec.md | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/specs/geometry/geometry_resolver_spec.md` | Active | 構造モデル (Vertex/Edge/Face/SnapPoint) から座標情報を一元的に生成し、 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/specs/geometry/index_map_spec.md` | Active | 内部ID (`V:0`〜`V:7`) を座標へ変換するための | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/specs/geometry/plane_builder_spec.md` | Active | docs/specs/geometry/plane_builder_spec.md | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/specs/net/net_mapping_spec.md` | Active | 展開図描画を距離判定に依存せず、 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/specs/storage/storage_adapter_spec.md` | Active | 無料版/有料版で保存機能を切り替えられるよう、 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
| `docs/testing/verification_plan.md` | Active | 構造主体への移行後に、 | 2026-01-17T17:18:01+09:00 | 2026-01-17T17:18:01+09:00 |
