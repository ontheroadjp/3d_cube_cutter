# explanation_templates.md

Status: Active
Summary: 教育テンプレート（出力文の型/出し方）を定義する。実装契約は technical spec を参照する。

# 3D 立体切断シミュレーター: 自動解説テンプレート

上位方針（教育）:
- docs/education/philosophy.md
- docs/education/content_guidelines.md
- docs/education/cut_patterns.md

実装契約（技術）:
- docs/technical/specification/learning/explanation_generation_spec.md
- docs/technical/specification/snap_point_id_spec.md

## 1. 概要
本テンプレートは、SnapPointID に基づき、切断操作に対して自動的に解説文を生成するための指針をまとめます。
中学受験算数の立体切断学習において、切断パターンごとに重要な辺・頂点・面の意味を理解できるよう設計されています。

---

## 2. 解説生成の基本方針
1. 選択された SnapPointID から、点の種類（頂点/辺上/面中心）を判定
2. 点の位置関係（隣接する頂点・辺・面）を特定
3. 切断面の形状（三角形/四角形/平行四辺形など）を推定
4. 面積や辺の長さに関するヒントを生成
5. 重要な辺・頂点をハイライトして学習者に提示

---

## 3. SnapPointID 別の解説テンプレート

注意:
- SnapPointID の正は `docs/technical/specification/snap_point_id_spec.md` を参照する（例: `V:<index>`）。
- 学習者に提示する表示（{label} 等）は UI 側で置換し、SnapPointID を露出させない。

### 3.1 Vertex 型
- **形式**: `V:<index>`
- **解説文例**:
  ```
  選択した頂点 {label} は立方体の角です。
  この点を通る平面が切断面の一角を形成します。
  ```
- **教育効果**: 頂点を起点とする切断面の形状理解を促進

### 3.2 Edge 型
- **形式**: `E:<頂点1><頂点2>@<比率>`
- **解説文例**:
  ```
  選択点は {vertex1}–{vertex2} 辺上にあります。
  辺上の位置比率は {ratio} です。
  この点を通る平面は隣接する面と交わり、切断面を形成します。
  ```
- **教育効果**: 辺上比率と切断面の位置関係の理解

### 3.3 Face 中心型（必要に応じて拡張）
- **形式**: `F:<頂点1><頂点2><頂点3><頂点4>@center`
- **解説文例**:
  ```
  選択点は面 {vertex1}-{vertex2}-{vertex3}-{vertex4} の中心です。
  この点を通る平面は面の中央を通過し、切断面の中心を決定します。
  ```
- **教育効果**: 面中心を通る切断面の概念理解

---

## 4. 切断パターン別解説例

### 4.1 三角形切断（頂点3つ）
- SnapPointID: `[V:0, V:1, V:2]`
- 解説例:
  ```
  切断面は頂点 A, B, C を通る三角形です。
  この三角形の面積を求めるには、頂点間の距離を計算してください。
  頂点 A と B を結ぶ辺、B と C を結ぶ辺、C と A を結ぶ辺が三角形の辺です。
  ```
- ハイライト: 緑マーカーで頂点、重要辺は太線表示

### 4.2 1頂点 + 2辺上点
- SnapPointID: `[V:0, E:12@1/2, E:34@1/2]`
- 解説例:
  ```
  切断面は頂点 A と、辺 B–C の中点、辺 D–E の中点を通る三角形です。
  辺上点の位置比率を理解して、三角形の形状を把握してください。
  ```
- ハイライト: 頂点緑、辺上点黄色

---

## 5. 実装側フロー（参照）
実装側の入出力契約・不変条件・ハイライト指示は以下を正とする。
- docs/technical/specification/learning/explanation_generation_spec.md

---

## 6. 教育支援との統合ポイント
- SnapPointID からマーカー色や太線を決定
- 解説文に SnapPointID を自動挿入
- 展開図や立体図にハイライト表示
- パターンごとに生成された文章を画面に表示
- 数学的理解の補助として、頂点・辺・面の関係を強調

---

## 7. まとめ
- SnapPointID を軸に解説を生成することで、教育ツールとしての一貫性を保持
- 頂点、辺、面の種類に応じた解説テンプレートを事前定義
- Cutter / SelectionManager / PresetManager と統合して、自動解説をリアルタイム表示可能
