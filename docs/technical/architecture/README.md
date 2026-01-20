# アーキテクチャ（技術）

Status: Active
Summary: 設計判断の前提・責務・依存方向・不変の構造を正として固定する。

## 目的
- 実装の前提となる設計判断を一箇所に集約する
- 仕様（Specification）と混在させず、責務と境界を明確にする
- boundary は責務/依存方向の正、contract は入出力契約の正とする

## 主要ドキュメント
- docs/technical/architecture/structure_first_principles.md
- docs/technical/architecture/engine_ui_boundary.md
- docs/technical/architecture/edu_engine_boundary.md

## 関連仕様
- docs/technical/specification/object_model/structure_model_spec.md
- docs/technical/specification/object_model/object_model_spec.md
- docs/technical/specification/ui/engine_ui_contract.md
- docs/technical/specification/labeling/labeling_spec.md
