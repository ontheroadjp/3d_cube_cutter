# structure_model_spec.md

# 3D 立体切断シミュレーター: 構造モデル仕様書

## 1. 目的
構造主体アーキテクチャにおける Vertex / Edge / Face / SnapPoint のデータ仕様を定義し、
座標依存を排除した安定的な切断・解説生成の基盤とする。

---

## 2. モデル区分
本仕様では、構造情報と座標情報を分離するために 2 層を定義する。

- **構造モデル層 (Structural)**
  - 幾何の意味関係のみを保持
  - 座標は持たない
- **解決済み層 (Resolved)**
  - GeometryResolver により座標が付与された結果

---

## 3. 構造モデル (Structural) の仕様

### 3.0 ID 型の定義
- **VertexID**: `V:<index>` (例: `V:0`)
- **EdgeID**: `E:<index1><index2>` (例: `E:01`)
- **FaceID**: `F:<indices>` (例: `F:0123`)
- **SnapPointID**: `V:*` / `E:*@n/d` / `F:*@center`

### 3.1 Vertex
- **id**: `V:<index>` (例: `V:0`)
- **label**: 表示用ラベル (ユーザー指定、例: `P`)
- **index**: 0-7 の固定インデックス
- **edges**: EdgeID[]
- **faces**: FaceID[]

### 3.2 Edge
- **id**: `E:<index1><index2>` (例: `E:01`)
- **vertices**: [VertexID, VertexID]
- **faces**: FaceID[]
- **snapPoints**: EdgeSnapPoint[]

### 3.3 Face
- **id**: `F:<indices>` (例: `F:0123`)
- **vertices**: VertexID[] (CCW 順)
- **edges**: EdgeID[]
- **adjacentFaces**: FaceID[]

### 3.4 SnapPointRef
- **id**: SnapPointID
- **type**: `'vertex' | 'edge' | 'face'`
- **vertexId?**: VertexID (type='vertex')
- **edgeId?**: EdgeID (type='edge')
- **ratio?**: { numerator: number; denominator: number } (type='edge')
- **faceId?**: FaceID (type='face')

### 3.5 EdgeSnapPoint
- **edgeId**: EdgeID
- **ratio**: { numerator: number; denominator: number }
- **snapId**: SnapPointID (例: `E:01@1/2`)

### 3.6 FaceCenter SnapPoint
- **snapId**: `F:<indices>@center` (例: `F:0123@center`)
- **faceId**: FaceID

---

## 4. 解決済みモデル (Resolved) の仕様

### 4.1 ResolvedSnapPoint
- **ref**: SnapPointRef
- **position**: THREE.Vector3
- **label**: UI 表示用文字列

### 4.2 ResolvedEdge
- **edgeId**: EdgeID
- **start**: THREE.Vector3
- **end**: THREE.Vector3
- **length**: number

### 4.3 ResolvedFace
- **faceId**: FaceID
- **vertices**: THREE.Vector3[]
- **normal**: THREE.Vector3
- **basisU / basisV**: THREE.Vector3 (展開図用)

---

## 5. 不変条件 (Invariants)
- Edge ラベルは辞書順で正規化 (`AB` と `BA` は同一)
- SnapPointID は分数表記で保持し、既約分数に正規化
- Face の頂点順は CCW を維持 (外向き法線)
- `F:*@center` は 4 頂点の中心として扱う
- SnapPointRef は常に正規化済み ID を参照する

---

## 6. ラベルと座標系の規約
座標系は右手系とし、軸の向きは次の通りとする。

- **x**: 右方向
- **y**: 上方向
- **z**: 手前方向

内部インデックスの配置は以下を正とする。

```
Top (y+):   4(-x,+y,+z)  5(+x,+y,+z)  6(+x,+y,-z)  7(-x,+y,-z)
Bottom (y-):0(-x,-y,+z)  1(+x,-y,+z)  2(+x,-y,-z)  3(-x,-y,-z)
```

---

## 7. 例: 立方体の構造モデル

---

```
Vertex: V:0, V:1, ...
Edge: E:01, E:12, ...
Face: F:0123, F:4567, ...
SnapPoint: E:01@1/2, V:0
```

---

## 8. 運用ルール
- SelectionManager は SnapPointRef を保持し、座標は持たない
- Cutter は SnapPointID を入力とし、GeometryResolver 経由で座標を取得
- UI 表示は ResolvedSnapPoint の label / position を参照

---

## 9. まとめ
- 構造モデルは座標を持たない
- 座標は GeometryResolver で一元的に解決
- SnapPointID が構造と教育解説の共通軸となる
