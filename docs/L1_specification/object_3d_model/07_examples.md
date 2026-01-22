# L1_specification/object_3d_model/07_examples.md

# 07 Examples

本ドキュメントはIDや入力（Cut/Net）の具体例を示す。

---

## 1. ID例

### VertexID
- `V:0`
- `V:12`

### EdgeID
- `E:0-1`
- `E:0-10`
- `E:12-105`

### FaceID
- `F:0-1-2-3`
- `F:0-10-11-5`
- `F:0-1-2`（三角面）

---

## 2. SnapPointID例

### Vertex
- `V:0`

### Edge ratio
- `E:0-10@1/2`
- `E:12-105@3/5`

### Face center
- `F:0-1-2-3@center`

---

## 3. CutInput例（3点で切断面を定義）

- snapPoints:
  - `E:0-1@1/2`
  - `E:1-2@1/3`
  - `V:6`

この3点が定義する平面が Cut の入力（SSOT）となる。
THREE.Plane は派生キャッシュである。

---

## 4. NetInput例（展開のヒンジ関係）

- rootFaceId: `F:0-1-2-3`
- hinges:
  - parent: `F:0-1-2-3`
    child:  `F:0-1-5-4`
    hingeEdgeId: `E:0-1`
  - parent: `F:0-1-2-3`
    child:  `F:1-2-6-5`
    hingeEdgeId: `E:1-2`

展開の「どの面をどの辺で開くか」は hinges により構造として保持する。
2D配置は派生である。

---

## 5. EdgeLink例（隣接の導出）

例：edgeId `E:0-1` が2つの面に共有される

    EdgeLink {
      edgeId: "E:0-1",
      sides: [
        { faceId: "F:0-1-2-3", localEdgeIndex: 0, dir:  1 },
        { faceId: "F:0-1-5-4", localEdgeIndex: 0, dir: -1 }
      ]
    }

- `sides` の相手側が「隣接面」を意味する
- localEdgeIndex は Face.vertices(CCW) から定義される

