# DOCS_INDEX

ドキュメント一覧（Status/作成日/更新日）。日付は git log に基づきます。

| No | Path | Status | Description | Created (ISO) | Updated (ISO) |
| --- | --- | --- | --- | --- | --- |
| 1 | `docs/README.md` | Active | 本プロジェクトは、中学受験算数向けの教育ツールとして、立方体・直方体の切断操作をシミュレーションするウェブアプリケーションです。 | 2026-01-17T17:18:01+09:00 | 2026-01-19T08:21:11+09:00 |
| 2 | `docs/architecture/design_principles.md` | Active | この文書では、現行の 3dcubecutter プロジェクトを 構造主体アーキテクチャ (Structure-First Architecture) に移行する際の基本設計原則をまとめます。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 3 | `docs/architecture/education_engine_integrated_design.md` | Active | 中学受験向け立体切断シミュレーターの教育思想・設計・機能構想を統合的に記述する。 | 2026-01-17T21:51:38+09:00 | 2026-01-18T02:42:11+09:00 |
| 4 | `docs/architecture/engine_ui_contract.md` | Active | 現行UIとEngineの責務境界およびグローバルAPI契約を定義する。 | 2026-01-17T21:51:38+09:00 | 2026-01-19T08:21:11+09:00 |
| 5 | `docs/architecture/object_model_spec.md` | Draft | アプリ全体を対象に、立体・切断・展開図の要素をオブジェクトとして保持するための最小モデル仕様を定義する。 | 2026-01-19T08:21:11+09:00 | 2026-01-19T08:21:11+09:00 |
| 6 | `docs/architecture/snap_point_id_naming.md` | Active | SnapPointID の命名規則と運用ルールを定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 7 | `docs/architecture/snap_point_id_parsing.md` | Active | SnapPointID を安全に扱うため、文字列 → 構造化データへの変換規則と正規化規則を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 8 | `docs/architecture/snap_point_id_spec.md` | Active | SnapPointID は、立方体・直方体上のすべての切断点（ユーザー選択点、交点、プリセット点）を一意に識別するためのIDです。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 9 | `docs/architecture/structure_first_overview.md` | Active | この文書では、構造主体アーキテクチャに基づき、立方体（直方体）および切断点管理のための主要構造オブジェクトを定義します。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 10 | `docs/architecture/structure_model_spec.md` | Active | 構造主体アーキテクチャのVertex/Edge/Face/SnapPoint仕様と座標非依存の基盤を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 11 | `docs/architecture/ui_layer_design.md` | Draft | 現行UIの構成と、Three.js描画との責務分離方針を整理する。 | 2026-01-17T21:51:38+09:00 | 2026-01-18T16:15:17+09:00 |
| 12 | `docs/architecture/vertex_labeling_spec.md` | Active | ユーザー指定ラベルと内部IDの両立ルールを定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 13 | `docs/education/explanation_templates.md` | Active | 本テンプレートの上位方針は docs/architecture/educationengineintegrateddesign.md に準拠する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 14 | `docs/education/mobile_ui_policy.md` | Active | モバイルでの操作性確保のためUI/機能の簡略化方針を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 15 | `docs/implementation_notes.md` | Draft | 現行実装の把握と構造主体移行のための実装メモを整理する。 | 2026-01-17T07:32:40+09:00 | 2026-01-19T08:21:11+09:00 |
| 16 | `docs/legacy/v0.0.1/implementation_notes.md` | Legacy | このドキュメントは、立体切断シミュレーターの内部実装に関する技術的な詳細と、新たな機能追加や修正を行う開発者向けのガイドラインを記載します。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 17 | `docs/legacy/v0.0.1/specification.md` | Legacy | 本プロジェクトは、中学受験算数の重要かつ難関単元である「立体切断（立方体・直方体の切断）」を、Webブラウザ上で直感的に学習できるシミュレーターです。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 18 | `docs/migration/architecture_migration_plan.md` | Superseded | 置き換え先: docs/migration/structurefirstmigrationplan.md。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 19 | `docs/migration/implementation_checklist.md` | Superseded | 構造主体移行は完了済み。本チェックリストは記録用。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 20 | `docs/migration/object_model_migration_plan.md` | Active | 立体/切断/展開図の全要素をオブジェクト化するための段階的移行計画。 | 2026-01-19T08:21:11+09:00 | 2026-01-19T08:21:11+09:00 |
| 21 | `docs/migration/object_model_next_phase_plan.md` | Draft | Object Model 参照を展開図以外の描画へ段階拡張するための計画。 | 2026-01-19T08:21:11+09:00 | 2026-01-19T08:21:11+09:00 |
| 22 | `docs/migration/object_model_worklog.md` | Active | オブジェクトベース移行の作業履歴を記録する。 | 2026-01-19T08:21:11+09:00 | 2026-01-19T09:52:48+09:00 |
| 23 | `docs/migration/react_ui_migration_plan.md` | Active | 学習機能の拡張に備え、UI層をReactへ段階移行する。 | 2026-01-17T21:51:38+09:00 | 2026-01-18T02:42:11+09:00 |
| 24 | `docs/migration/step0_current_architecture.md` | Legacy | 構造主体移行の前提として、現行実装の責務とフローを整理する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 25 | `docs/migration/structure_first_migration_plan.md` | Superseded | 置き換え先: docs/migration/implementationchecklist.md。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 26 | `docs/migration/typescript_migration_plan.md` | Superseded | 移行は完了済み。本ドキュメントは記録用。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 27 | `docs/patterns/frequent_patterns.md` | Active | 本ファイルの上位方針は docs/architecture/educationengineintegrateddesign.md に準拠する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 28 | `docs/patterns/frequent_patterns_snapid.md` | Active | 本ドキュメントの上位方針は docs/architecture/educationengineintegrateddesign.md に準拠する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 29 | `docs/presets/preset_snapid_notes.md` | Active | SnapPointID を使ったプリセット切断パターンを PresetManager / presetData.js で扱う際の注意点とベストプラクティスを整理します。 | 2026-01-17T17:18:01+09:00 | 2026-01-19T09:01:16+09:00 |
| 30 | `docs/presets/preset_snapid_usage.md` | Active | SnapPointIDプリセットの適用手順と実装例を示す。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 31 | `docs/presets/preset_unification_policy.md` | Active | 標準プリセットとユーザープリセットの統一運用方針を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 32 | `docs/presets/user_preset_state_spec.md` | Active | ユーザープリセットとして状態を保存・復元する仕様を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 33 | `docs/specs/cutter/cut_result_builder_spec.md` | Active | CSG の切断結果から CutResult を組み立てる仕様を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 34 | `docs/specs/cutter/cut_result_schema.md` | Active | CutResult/IntersectionPointの構造仕様と再利用方針を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 35 | `docs/specs/cutter/cutter_module_spec.md` | Active | Cutter を構成する各モジュールの役割と責務を整理する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 36 | `docs/specs/cutter/cutter_spec.md` | Active | Cutter モジュールは、3D立方体の切断処理を担当するコアコンポーネントです。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 37 | `docs/specs/cutter/intersection_calculator_spec.md` | Active | 切断平面と辺の交点計算を安定化する仕様を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 38 | `docs/specs/geometry/geometry_resolver_spec.md` | Active | 構造モデルから座標情報を一元生成するGeometryResolverの仕様を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 39 | `docs/specs/geometry/index_map_spec.md` | Active | 内部IDと座標の対応関係を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 40 | `docs/specs/geometry/plane_builder_spec.md` | Active | SnapPoint から切断平面を生成する仕様を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 41 | `docs/specs/net/net_mapping_spec.md` | Active | 構造情報から展開図を安定描画するNetManagerの仕様を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-19T09:01:16+09:00 |
| 42 | `docs/specs/storage/storage_adapter_spec.md` | Active | 保存機能の無料/有料切替を支えるStorageAdapter仕様を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 43 | `docs/specs/ui/ui_spec.md` | Active | 現行UIの仕様（サイドバー/ヘッダー/プリセット/設定/学習）を定義する。 | 2026-01-18T16:15:17+09:00 | 2026-01-19T08:21:11+09:00 |
| 44 | `docs/testing/verification_plan.md` | Active | 構造主体移行後の正確性・教育機能・数値安定性の検証計画を定義する。 | 2026-01-17T17:18:01+09:00 | 2026-01-18T02:42:11+09:00 |
| 45 | `docs/workflow.md` | Active | Issue/PR 駆動の作業手順と命名規則を定義する。 | 2026-01-19T11:06:02+09:00 | 2026-01-19T11:06:02+09:00 |
