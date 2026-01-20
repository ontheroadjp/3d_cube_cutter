# 構造主体アーキテクチャの原則

Status: Active
Summary: 構造主体アーキテクチャの前提・責務・依存方向を定義する。

## 1. 目的
- 座標依存ではなく構造IDを正として扱う
- 教育ツールとしての説明可能性と数値安定性を両立する
- 仕様レイヤと混在しない設計原則を明文化する

---

## 2. 設計原則（正）

### 2.1 Structure-First
- 立体の「関係性」を正とし、座標は派生情報に限定する
- SnapPointID を中核にし、選択/切断/展開/解説が同じID軸で繋がる

### 2.2 責務の分離
- Model は状態と関係性を保持する
- GeometryResolver は派生座標の解決のみを担う
- View は Model の読み取りに専念し、構造の正を持たない

### 2.3 依存方向の固定
- UI は Engine/Model を直接操作しない
- Engine は UI の内部実装に依存しない
- 依存方向は UI → Engine → Model → Resolver の一方向を正とする

---

## 3. 不変の構造
- ID は一意で不変
- 立体の構造は Vertex/Edge/Face の関係性で表現する
- SnapPoint は構造上の位置を示す参照であり、座標の別名ではない

---

## 4. データフローの原則
1. ユーザー操作は SnapPointID を選択する
2. 切断処理は SnapPointID を入力とする
3. 描画や UI は派生座標を参照する
4. 解説やハイライトは構造情報を参照する

---

## 5. 仕様への参照
- 構造モデル仕様: docs/technical/specification/object_model/structure_model_spec.md
- オブジェクトモデル仕様: docs/technical/specification/object_model/object_model_spec.md
- SnapPointID 仕様: docs/technical/specification/snap_point_id_spec.md

---

## 6. まとめ
- 構造が真実であり、座標は派生
- 依存方向と責務を固定し、拡張時の破綻を防ぐ
- 教育的説明と実装の一貫性を維持する
