# 教育要件とエンジン設計の境界

Status: Active
Summary: 教育的要求が技術設計に与える「境界条件（不変の制約）」のみを定義する。

## 目的
- 教育設計（学習体験）の都合で、技術側が必ず守るべき制約を固定する
- 理由（教育思想/学習者モデル）は education に置き、ここでは技術側の境界条件を正として扱う

## 境界条件（正）
### 入力/操作（離散化）
- 切断点の指定は SnapPointID（離散）で行う
- 任意座標入力は許可しない（UI/Engine ともに）
- 同一辺上に複数点を同時指定しない（重複・曖昧さを排除する）

### 表現/データ（説明可能性）
- 構造（面/辺/点/隣接）を正とし、座標は派生値に限定する
- 切断/展開/解説/ハイライトは同じ ID 軸（SnapPointID/FaceId/EdgeId 等）で接続できること

### 仕様レイヤ（混在禁止）
- 教育的な理由・教え方・UI での出し方は `docs/education/` を正とする
- 実装契約（入出力・不変条件・フォーマット）は `docs/technical/specification/` を正とする

## 技術側への含意（指針）
- 浮動小数点誤差で教育的意味が崩れる経路（座標ベースの同一視など）を正から外す
- UI は Engine 公開 API にのみ依存し、内部構造へ直接依存しない

## References
Education（理由/方針）:
- docs/education/philosophy.md
- docs/education/learner_model.md
- docs/education/learning_goals.md
- docs/education/cut_patterns.md
- docs/education/explanation_templates.md
- docs/education/ui_policy.md

Technical（契約/仕様）:
- docs/technical/specification/snap_point_id_spec.md
- docs/technical/specification/learning/explanation_generation_spec.md
- docs/technical/specification/ui/engine_ui_contract.md

Legacy（統合版）:
- docs/legacy/technical/architecture/edu_engine_boundary_integrated.md
