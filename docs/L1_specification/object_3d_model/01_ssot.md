# 01 SSOT (Single Source of Truth)

本ドキュメントは、本プロジェクトで **唯一の正（SSOT）** として扱う情報を定義する。
本仕様に反する実装は採用しない。

---

## 1. SSOT（唯一の正）

### 1.1 Topology（構造）
SSOTとして保持する。

- Vertex：VertexID（+必要ならラベル）
- Edge：2頂点の組（vA, vB）
- Face：頂点列（CCW順）

備考：
- **Face.vertices(CCW)** が面の定義として最重要である
- 面内のローカル辺番号は Face.vertices から導出する

---

### 1.2 SnapPoint（構造的な点）
SSOTとして保持する。

- SnapPointID
- SnapPointRef（SnapPointIDを参照する構造的オブジェクト）

---

### 1.3 操作入力（Cut / Net）
SSOTとして保持する。

- CutInput：`snapPoints: SnapPointRef[]`
- NetInput：`rootFaceId` と `hinges`

---

## 2. SSOTではないもの（派生情報）

以下は SSOT にしてはならない。

- position / normal / length
- area / volume
- Face投影基底（uvBasis / basisU,basisV）
- Cut結果（交線、分割ポリゴン、断面ポリゴン）
- Net結果（展開図2D配置、上下左右など）
- THREE.Plane 等の座標系依存データ

---

## 3. SSOTの不変条件（Invariants）

- Edge は常に2頂点
- Face は CCW 順序を持つ
- ID は安定（変更しない）
- 派生情報は再計算可能であること

