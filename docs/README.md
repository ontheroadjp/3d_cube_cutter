# 3D 立体切断シミュレーター ドキュメント

## 1. 概要
本プロジェクトは、中学受験算数向けの教育ツールとして、立方体・直方体の切断操作をシミュレーションするウェブアプリケーションです。
構造主体アーキテクチャへの移行を前提に、SnapPointID を中心とした仕様を整理しています。

---

## 2. ドキュメント構成

```
3d_cube_cutter/
├─ docs/
│  ├─ README.md
│  ├─ architecture/
│  │  ├─ design_principles.md
│  │  ├─ structure_first_overview.md
│  │  ├─ structure_model_spec.md
│  │  ├─ snap_point_id_naming.md
│  │  ├─ snap_point_id_spec.md
│  │  ├─ snap_point_id_parsing.md
│  │  └─ vertex_labeling_spec.md
│  ├─ migration/
│  │  ├─ architecture_migration_plan.md
│  │  ├─ step0_current_architecture.md
│  │  └─ structure_first_migration_plan.md
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
│  │  └─ storage/
│  │     └─ storage_adapter_spec.md
│  │  └─ net/
│  │     └─ net_mapping_spec.md
│  ├─ testing/
│  │  └─ verification_plan.md
│  ├─ migration/
│  │  └─ implementation_checklist.md
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
| `docs/presets/user_preset_state_spec.md` | ユーザープリセット（状態保存）仕様 |
| `docs/presets/preset_unification_policy.md` | プリセット統合方針 |
| `docs/migration/architecture_migration_plan.md` | 移行計画（全体） |
| `docs/migration/step0_current_architecture.md` | 現行コードの責務整理 |
| `docs/migration/structure_first_migration_plan.md` | 移行手順（詳細） |
| `docs/migration/implementation_checklist.md` | 実装チェックリスト |
| `docs/specs/geometry/geometry_resolver_spec.md` | GeometryResolver 仕様 |
| `docs/specs/geometry/index_map_spec.md` | indexMap の実装仕様 |
| `docs/specs/cutter/cut_result_schema.md` | CutResult/交点のデータ仕様 |
| `docs/specs/net/net_mapping_spec.md` | 展開図の構造マッピング仕様 |
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
旧版の仕様は `docs/legacy/v0.0.1/` に隔離しています。必要な場合のみ参照してください。
