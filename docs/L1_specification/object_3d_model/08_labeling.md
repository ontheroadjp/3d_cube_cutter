# 08 Labeling (Presentation Metadata within object_3d_model)

本ドキュメントは、object_3d_model における **Labeling（表示用メタデータ）** を定義する。

重要：
- Labeling は **Presentation Metadata** であり、Topology SSOT ではない
- 表示名（ラベル文字列）は学習体験のために存在し、内部構造の正しさには影響しない
- 表示要素（ラベル）は、必要に応じて UI で表示/非表示を切り替えられる
- ラベルは展開アニメーションに追従する（表示ONの場合）

---

## 1. 目的

- 学習者にとって理解しやすいラベル（A,B,C… / 面1.. / AB=5 等）を提供する
- 内部処理は常に SSOT（VertexID / EdgeID / FaceID）で行い、表示は分離する
- 展開（Net）により同一頂点が複数箇所に現れる場合でも破綻しないラベル構造を提供する

---

## 2. 基本方針（最重要）

### 2.1 二段階変換
- 構造の真実：VertexID / EdgeID / FaceID（SSOT）
- 表示の真実：LabelSlot（slot と text）
- 変換：ID -> LabelSlotID -> text

### 2.2 展開を考慮したラベルの分離
Net（展開）を行うと、折り畳み時に同一点だった Vertex が、展開後に **面ごとに分離して見える**。

そのため本アプリでは、頂点ラベルを次の2種類に分離する。

- **VertexNameSlot（概念ラベル）**
  - 「頂点 V:0 の名前は A」など、意味（名前）を保持する
  - VertexID に対して 1つ
- **CornerLabelSlot（表示スロット）**
  - 「Faceの角（corner）に A を表示する」など、表示位置を保持する
  - Faceの角（FaceCorner）に対して 1つ

これにより、
- 折り畳み状態：同一点に複数の CornerLabelSlot が重なり得る（表示の間引きが必要）
- 展開状態：同名ラベル（A）が複数箇所に表示される（意図通り）

を自然に表現できる。

---

## 3. 用語

- LabelSlot：表示文字列または表示参照を保持するスロット（IDを持つ）
- FaceCorner：面の頂点列（CCW）における「角」の参照（faceId + cornerIndex）
- VertexName：頂点の概念名（A,B,C…）
- CornerLabel：FaceCorner に表示するラベル（展開後の配置単位）

---

## 4. データモデル

### 4.1 共通

    type LabelSlotID = string

    type LabelKind =
      | "vertex_name"
      | "corner_label"
      | "edge_label"
      | "face_label"

---

### 4.2 FaceCorner（面の角）

    type FaceCornerRef = {
      faceId: FaceID
      cornerIndex: number // 0..(n-1), Face.vertices[cornerIndex]
    }

- cornerIndex は Face.vertices（CCW）のインデックスである
- 同一 VertexID は複数FaceCornerRefに現れ得る

---

### 4.3 VertexNameSlot（頂点の概念名）

    type VertexNameSlotID = LabelSlotID

    type VertexNameSlot = {
      id: VertexNameSlotID
      kind: "vertex_name"
      vertexId: VertexID
      text: string
      meta?: {
        locale?: string
        style?: "default" | "emphasis" | "muted"
      }
    }

- VertexID に対して 1つ（概念名）
- text は変更可能（例：A→P）

---

### 4.4 CornerLabelSlot（面の角に表示するラベル）

    type CornerLabelSlotID = LabelSlotID

    type CornerLabelSlot = {
      id: CornerLabelSlotID
      kind: "corner_label"
      corner: FaceCornerRef
      vertexId: VertexID
      vertexNameSlotId: VertexNameSlotID
      meta?: {
        style?: "default" | "muted"
      }
    }

- FaceCornerRef ごとに 1つ
- CornerLabelSlot は「表示する文字列」ではなく「参照（VertexNameSlot）」を持つ
  - 表示文字列は VertexNameSlot.text により決まる

---

### 4.5 FaceLabelSlot（面ラベル）

    type FaceLabelSlotID = LabelSlotID

    type FaceLabelSlot = {
      id: FaceLabelSlotID
      kind: "face_label"
      faceId: FaceID
      text: string
    }

- FaceID に対して 1つ
- text は変更可能（例：面1 / 上面 / 断面）

---

### 4.6 EdgeLabelSlot（辺ラベル）

    type EdgeLabelSlotID = LabelSlotID

    type EdgeLabelSlot = {
      id: EdgeLabelSlotID
      kind: "edge_label"
      edgeId: EdgeID
      text?: string
    }

- 原則は自動生成（例：AB）
- 必要なら text を上書き可能（任意）

---

### 4.7 LabelStore（保持コンテナ）

    type LabelStore = {
      vertexNameSlots: Record<VertexNameSlotID, VertexNameSlot>
      cornerLabelSlots: Record<CornerLabelSlotID, CornerLabelSlot>
      faceLabelSlots: Record<FaceLabelSlotID, FaceLabelSlot>
      edgeLabelSlots: Record<EdgeLabelSlotID, EdgeLabelSlot>

      // 固定マッピング（生成時に確定し以後不変）
      vertexIdToNameSlotId: Record<VertexID, VertexNameSlotID>
      faceCornerToCornerSlotId: Record<string, CornerLabelSlotID> // key = faceId + ":" + cornerIndex
      faceIdToFaceSlotId: Record<FaceID, FaceLabelSlotID>
      edgeIdToEdgeSlotId: Record<EdgeID, EdgeLabelSlotID>
    }

---

## 5. 生成ルール（Solid生成時）

### 5.1 生成タイミング
- Solid（Topology）が確定した直後に LabelStore を生成する
- 以後 Topology が変わらない限り、マッピングは固定である

### 5.2 生成手順（推奨）
1) VertexNameSlot を全 VertexID 分生成
2) FaceCorner を全 Face から列挙し、CornerLabelSlot を生成
3) FaceLabelSlot を全 FaceID 分生成
4) EdgeLabelSlot を全 EdgeID 分生成
5) 各マッピング（ID -> SlotID）を固定する

注意：
- CornerLabelSlot は必ず VertexNameSlot を参照する（同名複数表示に対応するため）

---

## 6. デフォルト命名規則

### 6.1 VertexNameSlot.text（頂点名）
- N <= 26: `A..Z`
- 26 < N <= 52: `A..Z, A1..Z1`
- それ以上: `V0, V1, V2...`

### 6.2 FaceLabelSlot.text（面名）
- 推奨：自動連番（面1, 面2, ...）
- 断面Faceには推奨で `断面` または `切断面` を付与してよい（Presentation上の初期値）

### 6.3 EdgeLabelSlot.text（辺名）
- 推奨：両端頂点の VertexName を連結（例：AB）
- ただし辺ラベルは表示上の補助であり SSOTではない

---

## 7. 折り畳み時の CornerLabel 重なり（Dedup / 間引き）

折り畳み状態では、同一 VertexID を共有する複数の FaceCorner が同一点に重なり得る。
このとき CornerLabelSlot をすべて描画するとラベルが重なって読めない。

そのため Presentation Metadata として、CornerLabel の表示を間引くための規則を定義できる。

### 7.1 Dedup の目的
- 折り畳み状態では、同一 Vertex のラベル表示を 1つに抑える
- 展開状態では、面ごとに分離して複数表示する

### 7.2 DedupPolicy（推奨）

    type CornerLabelDedupPolicy =
      | "show_all"                  // 常に全CornerLabelを表示（重なる可能性）
      | "representative_by_face"    // 代表1つのみ表示（推奨）
      | "prefer_selected_face"      // 選択面を優先して代表表示（将来拡張）

推奨実装（representative_by_face）：
- 同一 VertexID を参照する CornerLabelSlot 群の中から
  - `faceOrderKey(faceId)` が最小のものを代表として表示する

ここで faceOrderKey は、FaceIDの文字列比較ではなく、
- Solid.faces の安定な列挙順
- または FaceIndex（SSOTから導出される整数キー）
など「安定な序列」を用いることを推奨する。

---

## 8. 更新ルール（ラベル変更）

### 8.1 更新対象
- 更新できるのは以下のみ
  - VertexNameSlot.text
  - FaceLabelSlot.text
  - EdgeLabelSlot.text（任意）

- CornerLabelSlot は参照を持つだけなので、通常 text は直接編集しない

### 8.2 バリデーション
#### VertexNameSlot.text
- 空文字禁止
- 重複禁止（逆引きが一意になるようにする）

#### FaceLabelSlot.text
- 空文字禁止
- 重複は許可（教育上カテゴリ化する場合がある）

#### EdgeLabelSlot.text（任意）
- 空文字禁止
- 重複は用途に応じて許可（逆引きするなら禁止推奨）

---

## 9. 変換ルール（内部 ↔ 表示）

### 9.1 VertexID -> 表示文字列
- VertexID から VertexNameSlot を引き、text を返す

    function getVertexNameText(vertexId):
      slotId = vertexIdToNameSlotId[vertexId]
      return vertexNameSlots[slotId].text

### 9.2 FaceCorner -> 表示文字列
- FaceCornerRef から CornerLabelSlot を引き、参照している VertexNameSlot.text を返す

    function getCornerLabelText(faceId, cornerIndex):
      key = faceId + ":" + cornerIndex
      cornerSlotId = faceCornerToCornerSlotId[key]
      cornerSlot = cornerLabelSlots[cornerSlotId]
      nameSlot = vertexNameSlots[cornerSlot.vertexNameSlotId]
      return nameSlot.text

---

## 10. SnapPoint 表示ルール

- SnapPointID / SnapPointRef は **内部ID（SSOT）で保存**する
- 表示時に LabelStore を介して、頂点名や辺名へ変換する

例：
- Vertex Snap：`A`
- Edge Snap：`ABの1/2`
- Face center：`面1中心`

---

## 11. ラベルの追従（Netとの整合）

表示がONの場合、ラベルは展開アニメーションに追従する必要がある。

- CornerLabelSlot は FaceCornerRef を持つ
  - FaceCornerRef は Face の pose に従って空間的に移動する
- FaceLabelSlot は Face の pose に従う
- EdgeLabelSlot は Edge の pose（両端点）に従う

よって、Labeling は NetDerived の pose を参照して描画されることを前提とする。

---

## 12. まとめ

- 頂点ラベルは「概念名（VertexNameSlot）」と「表示位置（CornerLabelSlot）」を分離する
- 展開後は同名ラベルが複数箇所に現れる（意図通り）
- 折り畳み時は重なりが起こるため DedupPolicy により代表表示を行う
- ラベルは表示ONの場合、展開アニメーションに追従する
