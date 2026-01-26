# L1_specification/object_3d_model/10_net.md

# 10 Net (Unfold) Specification

本ドキュメントは object_3d_model における **Net（展開）** を定義する。
Net は「多面体の面を共有辺（ヒンジ）を軸として順番に回転させ、展開図の状態へ遷移させる」機能である。

本仕様の前提：
- 展開は **1面ずつパタンパタン**と順に開くアニメーションを前提とする
- 展開パターン（基準面や開き方）は **複数**存在し得る。複数パターンに対応する
- 切断前の立体・切断後の立体の両方を展開対象とする
- 切断後立体には「断面（切断面）」が **Faceとして追加され得る**
- ラベル/マーカーなどの表示要素は（表示ONの場合）**展開アニメーションに追従する**

---

## 1. 3層構造における位置づけ

Net は object_3d_model の3層構造のうち、次の要素で構成される。

- SSOT Layer：
  - NetPlan（確定した展開計画）
- Presentation Metadata Layer：
  - 展開関連の表示設定（例：断面表示、ラベル表示、マーカー表示など）
- Derived Layer：
  - NetDerived（各面の姿勢、アニメ進捗、2D配置など）

---

## 2. 対象Solid（切断前 / 切断後）

Net は対象となる Solid を参照して実行される。対象は2種類ある。

- 切断前 Solid（originalSolid）
- 切断後 Solid（cutResultSolid）

切断後 Solid は、切断操作（CutResult）により生成され、断面 Face を含み得る。

---

## 3. 断面（切断面）の扱い

### 3.1 断面は Face として扱う
切断後 Solid は、断面を **Face（cutSurfaceFace）** として保持できる。

- cutSurfaceFace は通常Faceと同様に
  - FaceID
  - vertices（CCW）
  - edges
  を持つ

これにより、断面は次を自然にサポートできる。

- 断面形の表示（展開前/展開後）
- 断面の面積計算（Derived）
- 断面を含めた展開（Net対象）

### 3.2 断面の表示切替は UI の責務
断面を表示するかどうか（ON/OFF）は Presentation / UI で制御する。
ただし **断面が非表示であっても、NetPlan/NetDerived の構造整合性は維持される**。

---

## 4. Net のSSOT：NetPlan

Net は「展開の正（確定）」として NetPlan を保持する。
NetPlan は「どの面を基準に」「どの面をどのヒンジで」「どの順に」開くかを完全に規定する。

### 4.x NetPlan の生成方針（動的・構造主導）
NetPlan は**立体の構造（SSOT）から動的に生成**する。
具体的には以下を満たすこと。

- 立体の種類に依存せず、**Face/Edge/Vertex の隣接関係からヒンジを導出**する
- 立方体など特定形状に依存した固定テーブルやハードコードは採用しない
- 切断後の立体では、**切断で追加された Face/Edge/Vertex を含む SSOT を正とする**
- 展開順（faceOrder）は、ヒンジで接続された構造木に矛盾しない順序で生成する

この方針により「入力が変わるから別処理」ではなく、
**同一ロジックであらゆる多面体に対して NetPlan を生成**できる。

### 4.1 NetPlan

    type NetPlanID = string

    type NetHinge = {
      parentFaceId: FaceID
      childFaceId: FaceID
      hingeEdgeId: EdgeID
    }

    type NetPlan = {
      id: NetPlanID
      targetSolidId: string          // 対象Solid参照（切断前/後）
      rootFaceId: FaceID             // 基準面（固定表示を推奨）
      hinges: NetHinge[]             // 展開木（親子関係＋ヒンジ）
      faceOrder: FaceID[]            // 1面ずつ開く順序（アニメ順）
      meta?: {
        name?: string                // UIでのパターン名（任意）
      }
    }

重要：
- NetPlan は SSOT として扱う
- `hinges` は「展開木」を表す（通常、面数-1 本）
- `faceOrder` は「パタンパタン」の順序を表す

---

## 5. 複数展開パターン

同一の targetSolid に対して複数の NetPlan が存在し得る。
例えば基準面が異なる、展開木の取り方が異なる、開く順序が異なる等。

### 5.1 管理

    type NetPlanSet = {
      targetSolidId: string
      plans: NetPlan[]
      activePlanId?: NetPlanID
    }

- UI は plans の中から選択できる
- 「どのパターンで展開するか」は activePlanId の選択により確定する

---

## 6. 展開木（hinges）の構造的要件

`hinges` は面の隣接関係（共有辺）に基づく必要がある。

### 6.1 隣接の判定
- `parentFaceId` と `childFaceId` は `hingeEdgeId` を共有する必要がある
- 共有判定は SSOT（Face.vertices / EdgeID）から導出できる

### 6.2 木であること
- `rootFaceId` を根とする木構造であること
- cycle を含まないこと
- 各 childFace はただ1つの parentFace を持つこと

---

## 7. faceOrder（開く順序）

展開は 1面ずつ段階的に開くことを前提とするため、順序を SSOT として明示する。

### 7.1 ルール
- 推奨：rootFace は常に固定表示（開かない）とし、orderは「開いていく面列」を持つ

例：
- root固定
- faceOrder = [child1, child2, child3, ...]

### 7.2 妥当性
- faceOrder に含まれる各 Face は hinges により root へ到達可能であること
- faceOrder の並びは hinges の親子順序に矛盾しないこと（親が未展開で子が先に開かない等）

---

## 8. Derived：NetDerived（姿勢とアニメ進捗）

NetDerived は NetPlan と Resolved（座標解決済み）から生成される派生情報である。

### 8.1 FacePose（姿勢）

    type FacePose = {
      faceId: FaceID
      rotation: THREE.Quaternion
      translation: THREE.Vector3
    }

- pose は「展開前（折り畳み）」と「展開後（開いた）」の間を補間してよい

### 8.2 NetDerived

    type NetDerived = {
      planId: NetPlanID
      poses: Record<FaceID, FacePose>

      animation: {
        state: "idle" | "opening" | "opened" | "closing"
        currentFaceId?: FaceID
        stepIndex: number
        progress01: number
      }

      // 任意：2D展開図も将来対応する場合
      polygons2D?: Record<FaceID, Polygon2D>
    }

---

## 9. 展開の幾何（ヒンジ回転）

展開で面を回転させる軸は、hingeEdgeId により定義される。

### 9.1 ヒンジ軸の導出（Derived）
- hingeEdgeId（SSOT）を ResolvedEdge に解決し、
  - start, end をヒンジ軸（線分）として用いる

### 9.2 回転角の決定（概念）
- 親面の法線と子面の法線から dihedral angle（2面角）を求める
- 展開後は dihedral angle が 180°（同一平面）になるよう回転する

注意：
- 角度や法線計算は Derived であり SSOTではない
- SSOT は hingeEdgeId と親子関係のみ

---

## 10. 表示要素（ラベル/マーカー）の追従（重要）

本アプリは学習用途であるため、展開中も表示要素が正しく追従する必要がある。
表示要素のON/OFFは UI の責務だが、「追従する」という要件は Net の仕様として明記する。

### 10.1 表示要素の例
表示要素とは、次のような「ジオメトリに紐づくUI要素」を指す。

- CornerLabel（面の角の頂点ラベル）
- VertexName 表示（必要なら代表表示）
- FaceLabel / EdgeLabel / 辺の長さ表示
- SnapPoint マーカー（切断点マーカー）
- 切断点を含む辺の色分け（ハイライト）

### 10.2 追従の意味（仕様）
- 表示要素は紐づく対象（Face/Edge/Corner/SnapPoint）に対して **ローカル参照**を持つ
- NetDerived により FacePose が変化すると、表示要素の world transform も更新される
- 断面Faceも通常Faceと同様に追従対象となる（非表示であっても計算は可能）

---

## 11. UI（表示切替）との境界

以下は UI 仕様で定義し、本ドキュメントでは SSOT としない。

- 断面表示の ON/OFF
- 切断点/頂点マーカー表示の ON/OFF
- ラベルの ON/OFF（頂点/辺/面）
- 切断点が存在する辺の色分け ON/OFF
- 透明度、強調表示、ハイライト、ガイド線など

---

## 12. まとめ

- Net は「面をヒンジで順に開く」機能であり、1面ずつのアニメを前提とする
- 複数パターンは NetPlan の複数保持で対応する
- 切断後Solidも展開対象になり、断面は Face として扱える
- 断面の見せ方は UI のトグルで制御する
- ラベル/マーカーは表示ONの場合、展開アニメーションに追従する
- NetPlan（SSOT）と NetDerived（Derived）を分離し、構造主導の整合性を維持する
