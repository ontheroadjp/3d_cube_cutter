# L1_specification/object_3d_model/09_derived.md

# 09 Derived Layer Specification (Geometry / Resolved / CutPlane)

本ドキュメントは object_3d_model における **Derived Layer（派生情報）** を定義する。
Derived Layer は SSOT から計算される **再計算可能な派生情報**であり、唯一の正ではない。

---

## 1. Derived Layer の位置づけ（3層構造）

object_3d_model は次の3層で構成される。

1) SSOT Layer（唯一の正）
2) Presentation Metadata Layer（表示メタ）
3) Derived Layer（派生情報）

Derived Layer は次を満たす。

- SSOT から決定的に導出される
- いつでも破棄して再計算できる
- これ自体を正として扱わない（キャッシュとして保持は可）

---

## 2. Derived Layer に含まれるもの

Derived Layer は次を含む。

- Resolved（座標解決済み情報）
- CutPlane（切断平面：snapPoints から導出）
- Measurements（長さ・面積・体積など）
- NetDerived（展開図の2D配置など）

---

## 3. 生成責務（Resolver）

Derived は **Resolver（導出器）**によって生成される。

### 3.1 Resolver の原則
- Resolver は SSOT を変更しない
- 同じ SSOT から同じ Derived を生成する（決定性）
- Derived はキャッシュ可能だが、常に再生成可能である

### 3.2 Resolver が扱う入力（SSOT）
- Vertex / Edge / Face（Topology）
- SnapPointRef
- CutInput（snapPoints）
- NetInput（hinges）

---

## 4. Resolved（座標解決済み）

Resolved は描画や計算に必要な幾何情報である。
ただし Resolved 自体は SSOT ではない。

### 4.1 ResolvedSnapPoint

    type ResolvedSnapPoint = {
      ref: SnapPointRef
      position: THREE.Vector3
      label?: string
    }

- SnapPointRef（SSOT参照）を座標へ解決した結果

---

### 4.2 ResolvedVertex

    type ResolvedVertex = {
      vertexId: VertexID
      position: THREE.Vector3
    }

---

### 4.3 ResolvedEdge

    type ResolvedEdge = {
      edgeId: EdgeID
      start: THREE.Vector3
      end: THREE.Vector3
      length: number
    }

- Edge の長さ `length` は派生値である

---

### 4.4 ResolvedFace

    type ResolvedFace = {
      faceId: FaceID
      vertices: THREE.Vector3[]  // CCW
      normal: THREE.Vector3
      basisU: THREE.Vector3
      basisV: THREE.Vector3
    }

- normal / basis は投影や面内計算のための派生値

---

## 5. CutPlane（切断平面の派生）

Cut は入力（SSOT）と結果（Derived）を分離する。

### 5.1 CutInput（SSOT）
- snapPoints: SnapPointRef[]

### 5.2 CutPlane（Derived）

    type CutPlaneDerived = {
      snapPoints: SnapPointRef[]
      plane: THREE.Plane
      basisU?: THREE.Vector3
      basisV?: THREE.Vector3
    }

- `plane` は SSOT ではない（派生キャッシュ）
- `plane` は snapPoints から生成される

---

## 6. CutResult（切断結果の派生）

CutResult は、CutPlane と Topology（Resolved）から生成される切断の結果である。

    type CutResult = {
      cutSegments: Segment3D[]           // 面上の交線（線分群）
      cutFacePolygons: FacePolygon3D[]   // 分割された面ポリゴン群
      cutSurfacePolygon?: Polygon3D      // 断面ポリゴン（必要なら）
    }

- 交線や断面は派生情報であり SSOTではない
- 表示や求積に利用される

---

## 7. Measurements（計測値の派生）

Measurements は学習用途のために表示される派生値である。

    type Measurements = {
      edgeLength: Record<EdgeID, number>
      faceArea?: Record<FaceID, number>
      solidVolume?: number
    }

- edgeLength は ResolvedEdge.length から得られる
- faceArea / solidVolume は段階的実装でよい（将来拡張）

---

## 8. NetDerived（展開の派生）

Net の入力（SSOT）は hinges であり、2D配置は Derived である。

    type NetDerived = {
      polygons2D: Record<FaceID, Polygon2D>
      animation?: {
        state: "idle" | "opening" | "opened" | "closing"
        progress: number
      }
    }

---

## 9. 解決戦略（Resolver Strategy）

本仕様では SSOT が座標を持たない前提であるため、
座標解決は **Solid生成時に決まる参照系（Local Frame）** または **立体種別ごとのパラメータ**に依存する。

### 9.1 最低限の要件
Resolver は次を提供する必要がある。

- resolveVertexPosition(vertexId)
- resolveSnapPointPosition(snapPointRef)
- resolveEdge(edgeId)
- resolveFace(faceId)

### 9.2 実装の分岐（推奨）
Solid の種類に応じて Resolver を切り替える設計を推奨する。

- RectangularPrismResolver（直方体/立方体）
- TriangularPrismResolver（三角柱）
- PyramidResolver（錐体）
- CompositeSolidResolver（複合立体）

---

## 10. 禁止事項（Derived Layer）

- Derived を SSOT として扱うこと
- Cut の入力を THREE.Plane として保持すること（snapPoints が正）
- Derived の整合性を epsilon で帳尻合わせすること

---

## 11. まとめ

- Derived Layer は SSOT から計算される派生情報である
- Resolved / CutPlane / CutResult / Measurements / NetDerived はすべて再計算可能
- Resolver は SSOT を変更せずに Derived を生成する
- 立体の種類に応じた Resolver の分岐を許容する（拡張性）

