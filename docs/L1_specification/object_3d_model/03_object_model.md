# 03 Object Model (SSOT / Presentation Metadata)

本ドキュメントは object_3d_model の主要オブジェクト定義を記述する。
object_3d_model は 3層構造（SSOT / Presentation Metadata / Derived）で構成される。

本ファイルでは SSOT と Presentation Metadata を中心に定義する。
Derived は `09_derived.md` を参照する。

---

## 1. SSOT Layer（唯一の正）

SSOT は、立体の構造とユーザー入力を「唯一の正」として保持する層である。
SSOT は座標を持たず、Topology と参照（ID）を中心に構成される。

---

## 2. Topology（SSOT）

### 2.1 ID型

    type VertexID = string  // 例: "V:0"
    type EdgeID   = string  // 例: "E:0-1"（正規化済み）
    type FaceID   = string  // 例: "F:0-1-2-3"（正規化済み）

---

### 2.2 Vertex

    type Vertex = {
      id: VertexID
    }

- Vertex は内部識別（ID）のみを持つ
- 表示名（A,B,C…）は Presentation Metadata で扱う

---

### 2.3 Edge

    type Edge = {
      id: EdgeID
      v0: VertexID
      v1: VertexID
    }

- EdgeID は v0-v1 の正規化（min/max）により一意になることを推奨する

---

### 2.4 Face

    type Face = {
      id: FaceID
      vertices: VertexID[]  // CCW
    }

- Face は CCW 順の頂点列を保持する
- Face の辺（EdgeID）は vertices から導出できる（派生またはキャッシュ）

---

### 2.5 Solid（Topologyコンテナ）

    type SolidID = string

    type Solid = {
      id: SolidID
      vertices: Record<VertexID, Vertex>
      edges: Record<EdgeID, Edge>
      faces: Record<FaceID, Face>
    }

---

## 3. SnapPoint（SSOT）

SnapPoint は、切断や注釈で利用される「構造に紐づく点」の参照である。
SnapPoint は座標ではなく SSOT の参照（ID）で保存する。

### 3.1 SnapPointRef

    type SnapPointRef =
      | { kind: "vertex", vertexId: VertexID }
      | { kind: "edge_ratio", edgeId: EdgeID, numerator: number, denominator: number }
      | { kind: "face_center", faceId: FaceID }

- edge_ratio は「辺の内分点」を SSOT 参照として表す

---

## 4. Cut（切断）入力：CutInput（SSOT）

Cut は、ユーザーが指定した点（SnapPoint）により定義される。

    type CutInput = {
      snapPoints: SnapPointRef[] // 原則3点（将来拡張可）
    }

---

## 5. Net（展開）入力：NetPlan（SSOT）

Net は、展開の「正（確定計画）」として NetPlan を SSOT に保持する。
NetPlan は「基準面」「ヒンジ（親子面＋共有辺）」「開く順序」を完全に規定する。

    type NetPlanID = string

    type NetHinge = {
      parentFaceId: FaceID
      childFaceId: FaceID
      hingeEdgeId: EdgeID
    }

    type NetPlan = {
      id: NetPlanID
      targetSolidId: SolidID
      rootFaceId: FaceID
      hinges: NetHinge[]
      faceOrder: FaceID[]
      meta?: {
        name?: string
      }
    }

複数パターンを保持する場合は NetPlanSet を用いる。

    type NetPlanSet = {
      targetSolidId: SolidID
      plans: NetPlan[]
      activePlanId?: NetPlanID
    }

---

## 6. 切断後Solidと断面Face

CutResult により切断後の Solid が生成される場合、断面（切断面）は **Face** として Solid に含められる。

- 切断面 Face（cutSurfaceFace）は通常Faceと同様に
  - FaceID
  - CCW頂点列
  を持つ

断面の表示/非表示は UI の責務であり、SSOT の有無には影響しない。

---

## 7. Presentation Metadata Layer（表示の真実）

Presentation Metadata は学習体験と表示のための真実である。
SSOT の正しさには影響しない。

---

## 8. Labeling（Presentation Metadata）

Labeling は `08_labeling.md` に従う。
特に頂点ラベルは以下の2種を持つ。

- VertexNameSlot（VertexIDに1つ：概念名）
- CornerLabelSlot（FaceCornerに1つ：表示位置）

折り畳み時は CornerLabel が重なるため DedupPolicy を適用できる。

---

## 9. DisplayState（Presentation Metadata）

表示の切替は UI 仕様で定義するが、object_3d_model 内に保持する場合は Presentation Metadata とする。

例：
- showCornerLabels
- showFaceLabels
- showEdgeLengths
- showSnapPointMarkers
- showCutSurfaceFace
- highlightEdgesContainingSnapPoints

---

## 10. まとめ

- Topology（Vertex/Edge/Face）と SnapPointRef が SSOT の核である
- CutInput は SnapPointRef で保持する
- Net は NetPlan（展開計画）を SSOT として保持する
- 断面（切断面）は Face として切断後Solidに含められる
- ラベルは Presentation Metadata として分離され、CornerLabel により展開後の複数表示に対応する
