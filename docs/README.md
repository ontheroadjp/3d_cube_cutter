# 3D 立体切断シミュレーター ドキュメント

Status: Active
Summary: 本プロジェクトは、中学受験算数向けの教育ツールとして、立方体・直方体の切断操作をシミュレーションするウェブアプリケーションです。

## 1. 概要
本プロジェクトは、中学受験算数向けの教育ツールとして、立方体・直方体の切断操作をシミュレーションするウェブアプリケーションです。
構造主体アーキテクチャへの移行は完了しており、SnapPointID を中心とした仕様が整理されています。
TypeScript 移行は完了しており、`dist/` を出力して動作させます。
React UI 移行やオブジェクトモデル移行は継続中のため、`docs/migration/` を参照してください。

---

## 2. ドキュメント構成

```
3d_cube_cutter/
├─ docs/
│  ├─ README.md
│  ├─ architecture/
│  │  ├─ design_principles.md
│  │  ├─ education_engine_integrated_design.md
│  │  ├─ engine_ui_contract.md
│  │  ├─ structure_first_overview.md
│  │  ├─ structure_model_spec.md
│  │  ├─ snap_point_id_naming.md
│  │  ├─ snap_point_id_spec.md
│  │  ├─ snap_point_id_parsing.md
│  │  ├─ vertex_labeling_spec.md
│  │  ├─ object_model_spec.md
│  │  └─ ui_layer_design.md
│  ├─ migration/
│  │  ├─ architecture_migration_plan.md
│  │  ├─ implementation_checklist.md
│  │  ├─ step0_current_architecture.md
│  │  ├─ structure_first_migration_plan.md
│  │  ├─ typescript_migration_plan.md
│  │  ├─ react_ui_migration_plan.md
│  │  ├─ object_model_migration_plan.md
│  │  ├─ object_model_worklog.md
│  │  └─ object_model_next_phase_plan.md
│  ├─ education/
│  │  ├─ explanation_templates.md
│  │  └─ mobile_ui_policy.md
│  ├─ patterns/
│  │  ├─ frequent_patterns.md
│  │  └─ frequent_patterns_snapid.md
│  ├─ presets/
│  │  ├─ preset_snapid_notes.md
│  │  ├─ preset_snapid_usage.md
│  │  ├─ preset_unification_policy.md
│  │  └─ user_preset_state_spec.md
│  ├─ specs/
│  │  ├─ cutter/
│  │  │  ├─ cut_result_builder_spec.md
│  │  │  ├─ cut_result_schema.md
│  │  │  ├─ cutter_module_spec.md
│  │  │  ├─ cutter_spec.md
│  │  │  └─ intersection_calculator_spec.md
│  │  ├─ geometry/
│  │  │  ├─ geometry_resolver_spec.md
│  │  │  ├─ index_map_spec.md
│  │  │  └─ plane_builder_spec.md
│  │  ├─ net/
│  │  │  └─ net_mapping_spec.md
│  │  ├─ ui/
│  │  │  └─ ui_spec.md
│  │  └─ storage/
│  │     └─ storage_adapter_spec.md
│  ├─ testing/
│  │  └─ verification_plan.md
│  ├─ implementation_notes.md
│  └─ legacy/
│     └─ v0.0.1/
│        ├─ implementation_notes.md
│        └─ specification.md
```

---

## 3. 主要ドキュメント

| ファイル | 内容 |
|----------|------|
| `docs/architecture/design_principles.md` | 構造主体アーキテクチャの設計原則 |
| `docs/architecture/structure_first_overview.md` | 構造主体モデルの概要 |
| `docs/architecture/structure_model_spec.md` | Vertex/Edge/Face/SnapPoint の構造モデル仕様 |
| `docs/architecture/snap_point_id_naming.md` | SnapPointID 命名規則 |
| `docs/architecture/snap_point_id_spec.md` | SnapPointID 仕様書 |
| `docs/architecture/snap_point_id_parsing.md` | SnapPointID パース/正規化仕様 |
| `docs/architecture/vertex_labeling_spec.md` | 頂点ラベル設定仕様 |
| `docs/architecture/object_model_spec.md` | オブジェクトベースのモデル仕様 |
| `docs/architecture/education_engine_integrated_design.md` | 最重要: 思考整理ログ + 教育ツール設計の統合版 |
| `docs/architecture/engine_ui_contract.md` | UI/Engine の契約（API設計） |
| `docs/architecture/ui_layer_design.md` | UI層（React想定）の設計方針 |
| `docs/presets/user_preset_state_spec.md` | ユーザープリセット（状態保存）仕様 |
| `docs/presets/preset_unification_policy.md` | プリセット統合方針 |
| `docs/migration/architecture_migration_plan.md` | 移行計画（全体） |
| `docs/migration/step0_current_architecture.md` | 現行コードの責務整理 |
| `docs/migration/structure_first_migration_plan.md` | 移行手順（詳細） |
| `docs/migration/implementation_checklist.md` | 実装チェックリスト |
| `docs/migration/typescript_migration_plan.md` | TypeScript移行プラン |
| `docs/migration/react_ui_migration_plan.md` | React UI移行プラン |
| `docs/migration/object_model_migration_plan.md` | オブジェクトモデル移行計画 |
| `docs/migration/object_model_worklog.md` | オブジェクトモデル移行の作業履歴 |
| `docs/migration/object_model_next_phase_plan.md` | オブジェクトモデル移行の次フェーズ計画 |
| `docs/specs/geometry/geometry_resolver_spec.md` | GeometryResolver 仕様 |
| `docs/specs/geometry/index_map_spec.md` | indexMap の実装仕様 |
| `docs/specs/cutter/cut_result_schema.md` | CutResult/交点のデータ仕様 |
| `docs/specs/net/net_mapping_spec.md` | 展開図の構造マッピング仕様 |
| `docs/specs/ui/ui_spec.md` | UIの現行仕様（サイドバー/設定/プリセット） |
| `docs/specs/storage/storage_adapter_spec.md` | 保存アダプタ仕様 |
| `docs/testing/verification_plan.md` | 検証計画 |
| `docs/implementation_notes.md` | 現行実装ノート（移行向け） |
| `docs/education/mobile_ui_policy.md` | モバイルUI簡略化方針 |

---

## 4. 使い方の目安

- 設計方針を理解する: `docs/architecture/design_principles.md`
- SnapPointID を理解する: `docs/architecture/snap_point_id_spec.md`
- 移行計画を確認する: `docs/migration/architecture_migration_plan.md`
- 実装設計を確認する: `docs/specs/`

---

## 5. 補足
- 旧版の仕様は `docs/legacy/v0.0.1/` に隔離しています。必要な場合のみ参照してください。
- 移行計画ドキュメントは「当時の判断」を含むため、最新の方針は `docs/migration/*.md` の最新版を参照してください。

## 6. ステータス指標
新規参加者の混乱を避けるため、各ドキュメントの冒頭に以下のステータスを付与する運用を推奨します。

- `Status: Active` 現行の正式仕様/方針
- `Status: Draft` 作業中・将来計画
- `Status: Superseded` 置き換え済み（参照のみ）
- `Status: Legacy` 旧版

## 7. ドキュメント管理ルール
- 追加・更新したドキュメントは必ず `Status:` を冒頭に付与
- 仕様/方針の変更時は、旧ドキュメントを `Status: Superseded` に更新し、置き換え先を明記
- 移行計画は実施後に `Superseded` へ移行し、最新版の参照先を明記
- `docs/legacy` は参照のみ。現行仕様の根拠としては使わない

## 8. ドキュメント一覧の自動生成
ドキュメント一覧（Status/作成日/更新日）は自動生成します。

```
python3 scripts/generate_docs_index.py
```

生成結果: `docs/DOCS_INDEX.md`
注意: `DOCS_INDEX.md` は自動生成物のため、参照前に必ずスクリプトを実行して最新化してください。
