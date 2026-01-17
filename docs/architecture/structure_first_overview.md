# structure_first_overview.md

Status: Active

# 3D 立体切断シミュレーター: 構造主体モデルの概要

## 1. 概要
この文書では、構造主体アーキテクチャに基づき、立方体（直方体）および切断点管理のための主要構造オブジェクトを定義します。
設計の目的は、座標依存を排除し、教育ツールとして頻出パターンや重要辺のハイライト・解説生成を可能にすることです。

---

## 2. 主要構造オブジェクト

### 2.1 Vertex（頂点）
- **属性**
  - `id`: VertexID 文字列 (例: `V:0`)
  - `position`: THREE.Vector3
  - `label`: 画面表示用文字列（ユーザー指定可）
  - `edges`: 所属する Edge のリスト
  - `faces`: 所属する Face のリスト
- **用途**
  - 切断点が頂点の場合の SnapPointID として利用
  - 交点・輪郭線の構造情報として参照

---

### 2.2 Edge（辺）
- **属性**
  - `id`: EdgeID 文字列 (例: `E:01`)
  - `vertices`: 端点 Vertex の配列 `[v1, v2]`
  - `snapPoints`: Edge 上の SnapPoint 配列（比率 0〜1 の有理数）
- **用途**
  - SnapPointID が Edge 上の点を指す場合に使用
  - CSG 演算時の交点計算
  - 教育用ハイライト対象として重要辺にマーク可能

---

### 2.3 Face（面）
- **属性**
  - `id`: FaceID 文字列 (例: `F:0123`)
  - `vertices`: 頂点の配列
  - `edges`: 辺の配列
  - `normal`: THREE.Vector3 法線ベクトル
- **用途**
  - 展開図描画時の 2D マッピング基準
  - 面積計算・切断面生成
  - 教育用解説における面の識別

---

### 2.4 SnapPoint（スナップポイント）
- **属性**
  - `id`: SnapPointID 文字列
  - `type`: `'vertex' | 'edge' | 'face'`
  - `vertex?`: type='vertex' の場合の Vertex 参照
  - `edge?`: type='edge' の場合の Edge 参照
  - `ratio?`: type='edge' の場合の Edge 上の比率 (numerator/denominator)
  - `face?`: type='face' の場合の Face 参照
- **用途**
  - 選択点、交点、プリセット点など、すべての切断点の基準
  - Cutter は SnapPointID から座標を計算し切断処理に使用
  - 教育支援のハイライトや解説生成で参照

---

## 3. SnapPointID 命名規則（例）
- 頂点: `V:インデックス` 例: `V:0`
- 辺: `E:頂点1頂点2@比率` 例: `E:01@1/2`（0–1 辺の中点）
- 面中心: `F:頂点1頂点2頂点3頂点4@center` 例: `F:0123@center`
- これにより、ID から即座にどの構造要素かを特定可能

---

## 4. データフロー（構造主体版）
1. **ユーザー選択**: SnapPointID を選択
2. **SelectionManager**: SnapPointID を保持
3. **Cutter**:
   - SnapPointID → THREE.Vector3 座標
   - 切断平面定義
   - 交点生成 → SnapPointID/EdgeID で構造情報を保持
4. **NetManager / 展開図描画**:
   - SnapPointID と構造情報を元に面にマッピング
5. **教育支援機能**:
   - 頻出パターン、重要辺をハイライト
   - SnapPointID → 解説文自動生成

---

## 5. 教育機能との統合
- 頂点・辺・面の情報を保持することで、以下が容易になる：
  - 頻出パターンの認識と強調表示
  - 重要辺や交点の色分け
  - 選択履歴や切断結果に基づく解説生成
  - 展開図上での正確な切断線描画

---

## 6. まとめ
- 構造主体モデルにより、座標依存の不安定性を排除
- SnapPointID を中心に全ての切断点管理を統一
- 教育ツールとしての機能（ハイライト・解説・展開図）を構造情報ベースで実装可能
- 将来的な拡張やプリセットの追加も容易
