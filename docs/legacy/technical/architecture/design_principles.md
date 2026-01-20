# design_principles.md

Status: Superseded
Summary: 置き換え先は docs/technical/architecture/structure_first_principles.md
Replaced-by: docs/technical/architecture/structure_first_principles.md

# 3D 立体切断シミュレーター: 設計原則 (Design Principles)

## 1. 概要
この文書では、現行の 3d_cube_cutter プロジェクトを **構造主体アーキテクチャ (Structure-First Architecture)** に移行する際の基本設計原則をまとめます。

本設計の目的は次の通りです。

- 入力データ（切断点）を座標ではなく **構造的ID（SnapPointID）** で管理する
- 立方体や直方体の構造情報（頂点・辺・面）を中心に処理を組み立てる
- 教育ツールとしての用途を考慮し、切断面・交点・重要辺を正確かつ解説可能な形で保持する
- 数値誤差に依存しない安定した切断判定・交点計算を可能にする

---

## 2. 設計思想

### 2.1 構造主体 (Structure-First)
- Cube の頂点 (Vertex)、辺 (Edge)、面 (Face) を **オブジェクトとして明確に管理**
- 選択点は **SnapPointID** に基づき、頂点か辺上かを特定
- CSG演算や交点計算は **SnapPointID → 座標** の変換後に行う
- 構造情報があれば、展開図描画や断面面積計算、教育用解説の生成が容易

### 2.2 教育ツール重視
- 頻出パターン、重要な辺・頂点を **ハイライト表示**
- 切断面の説明や解説文の自動生成を可能に
- 選択点や交点の状態を明示的に保持し、誤認識を防ぐ
- UI操作と学習支援を分離し、再利用性を高める

### 2.3 数値安定性
- 現状の浮動小数点依存判定（plane.intersectLine や距離判定）を最小化
- SnapPointID と構造情報に基づき交点を算出
- 必要に応じて **スナップポイント比率** を用いて線分上の位置を正確に計算

---

## 3. 構造情報の中心化

### 3.1 Vertex, Edge, Face の管理
- `Vertex` クラス: 座標、ラベル、ID、所属する Edge/Face の参照
- `Edge` クラス: 端点 Vertex の参照、EdgeID、スナップポイントのリスト
- `Face` クラス: 形成する Vertex/Edge の集合、面ID

### 3.2 SnapPoint の概念
- Vertex の座標、Edge 上の比率 (0〜1) により一意に識別
- SnapPointID により座標変換可能
- 選択点・交点・プリセット定義で共通利用

---

## 4. データフローの原則
1. **ユーザー操作** → SnapPointID で選択
2. **Cutter モジュール** → SnapPointID → 座標変換 → CSG 演算
3. **交点・断面情報** → SnapPointID/EdgeID に基づき生成
4. **展開図・解説** → SnapPointID/構造情報をもとに描画・テキスト生成

---

## 5. 今後の実装上の留意点
- `Cutter.js` は CSG 演算のみに集中、構造情報管理は Cube/Geometry モジュールへ
- `SelectionManager.js` は SnapPointID の管理に専念
- `PresetManager.js` は SnapPointID の集合を返すように変更
- 教育向け機能（ハイライト、解説）は別モジュールで構造情報から生成

---

## 6. まとめ
- **構造情報が主役** → 座標は従属
- 教育支援と数値安定性を両立
- SnapPointID による統一管理で、切断面・展開図・解説生成の一貫性を確保

