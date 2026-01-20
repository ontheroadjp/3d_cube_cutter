# 3D 立体切断シミュレーター ドキュメント

Status: Active
Summary: 本プロジェクトは、中学受験算数向けの教育ツールとして、立方体・直方体の切断操作をシミュレーションするウェブアプリケーションです。

## 1. 概要
本プロジェクトは、中学受験算数向けの教育ツールとして、立方体・直方体の切断操作をシミュレーションするウェブアプリケーションです。
構造主体アーキテクチャへの移行は継続中で、SnapPointID を中心とした仕様の整備を進めています。
TypeScript 移行は完了しており、`dist/` を出力して動作させます。
React UI 移行やオブジェクトモデル移行は継続中のため、`docs/technical/migration/` を参照してください。

---

## 2. ドキュメント構成

```
3d_cube_cutter/
├─ docs/
│  ├─ README.md
│  ├─ CURRENT.md
│  ├─ workflow.md
│  ├─ documentation_policy.md
│  ├─ issue_pr_policy.md
│  ├─ technical/
│  │  ├─ README.md
│  │  ├─ architecture/
│  │  ├─ specification/
│  │  ├─ migration/
│  │  ├─ patterns/
│  │  ├─ testing/
│  │  └─ notes/
│  ├─ education/
│  │  ├─ README.md
│  │  ├─ philosophy.md
│  │  ├─ learning_goals.md
│  │  ├─ learner_model.md
│  │  ├─ ui_policy.md
│  │  ├─ content_guidelines.md
│  │  └─ examples/
│  ├─ migration/
│  │  └─ object_model/
│  │     └─ object_model_worklog.md
│  └─ legacy/
│     └─ v0.0.1/
│        ├─ implementation_notes.md
│        └─ specification.md
```

---

## 3. 主要ドキュメント

| ファイル | 内容 |
|----------|------|
| `docs/CURRENT.md` | 現在地（進行中のフェーズと次の作業） |
| `docs/documentation_policy.md` | ドキュメント管理ポリシー |
| `docs/workflow.md` | 作業フロー（Issue/PR/ブランチ運用） |
| `docs/issue_pr_policy.md` | Issue/PR 運用の入口 |
| `docs/technical/architecture/structure_first_principles.md` | 構造主体アーキテクチャの設計原則 |
| `docs/technical/architecture/engine_ui_boundary.md` | UI と Engine の境界設計 |
| `docs/technical/architecture/edu_engine_boundary.md` | 教育要件とエンジン設計の境界 |
| `docs/technical/specification/object_model/structure_model_spec.md` | Vertex/Edge/Face/SnapPoint の構造モデル仕様 |
| `docs/technical/specification/snap_point_id_spec.md` | SnapPointID 仕様書 |
| `docs/technical/specification/object_model/object_model_spec.md` | オブジェクトモデル仕様 |
| `docs/technical/specification/geometry/geometry_spec.md` | GeometryResolver 仕様 |
| `docs/technical/specification/cutter/cutter_spec.md` | Cutter 仕様 |
| `docs/technical/specification/net/net_mapping_spec.md` | 展開図の構造マッピング仕様 |
| `docs/technical/specification/ui/ui_spec.md` | UI の現行仕様 |
| `docs/technical/specification/storage/storage_adapter_spec.md` | 保存アダプタ仕様 |
| `docs/technical/migration/structure_first_migration/structure_first_migration_plan.md` | 移行計画（全体） |
| `docs/migration/object_model/object_model_worklog.md` | オブジェクトモデル移行の作業履歴（例外配置） |
| `docs/technical/testing/verification_plan.md` | 検証計画 |

---

## 4. 使い方の目安

- 設計方針を理解する: `docs/technical/architecture/structure_first_principles.md`
- SnapPointID を理解する: `docs/technical/specification/snap_point_id_spec.md`
- 移行計画を確認する: `docs/technical/migration/structure_first_migration/structure_first_migration_plan.md`
- 実装設計を確認する: `docs/technical/specification/`

---

## 5. 新規実装の読み順
新しいワークフローで作業を開始する際は、以下の順で読む。

1. `docs/README.md`
2. `docs/CURRENT.md`
3. `docs/workflow.md`
4. `docs/documentation_policy.md`
5. `docs/technical/README.md`

---

## 6. 補足
- 旧版の仕様は `docs/legacy/v0.0.1/` に隔離しています。必要な場合のみ参照してください。
- 移行計画ドキュメントは「当時の判断」を含むため、最新の方針は `docs/technical/migration/` を参照してください。

## 7. ステータス指標
新規参加者の混乱を避けるため、各ドキュメントの冒頭に以下のステータスを付与する運用を推奨します。

- `Status: Active` 現行の正式仕様/方針
- `Status: Draft` 作業中・将来計画
- `Status: Superseded` 置き換え済み（参照のみ）
- `Status: Legacy` 旧版

## 8. ドキュメント管理ルール
- 追加・更新したドキュメントは必ず `Status:` を冒頭に付与
- 仕様/方針の変更時は、旧ドキュメントを `Status: Superseded` に更新し、置き換え先を明記
- 移行計画は実施後に `Superseded` へ移行し、最新版の参照先を明記
- `docs/legacy` は参照のみ。現行仕様の根拠としては使わない

## 9. ドキュメント一覧の自動生成
ドキュメント一覧（Status/作成日/更新日）は自動生成します。

```
python3 scripts/generate_docs_index.py
```

生成結果: `docs/DOCS_INDEX.md`
注意: `DOCS_INDEX.md` は自動生成物のため、参照前に必ずスクリプトを実行して最新化してください。
