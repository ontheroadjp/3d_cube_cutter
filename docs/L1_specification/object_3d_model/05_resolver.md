# 05 Resolver Specification (SSOT -> Derived)

本ドキュメントは object_3d_model における Resolver（派生情報生成）の責務を定義する。
Resolver は SSOT を変更せず、Derived を生成する。

---

## 1. 役割

Resolver は次を提供する。

- Topology（SSOT）を座標へ解決し Resolved を生成する
- CutInput（SSOT）から CutPlane を導出する
- CutPlane と Resolved から CutResult を導出する
- NetPlan（SSOT）と Resolved から NetDerived を導出する
- Measurements（長さ・面積・体積など）を導出する（段階的実装可）

---

## 2. 原則

- Resolver は SSOT を変更しない
- 同一 SSOT から同一 Derived を生成する（決定性）
- Derived はキャッシュ可能だが、常に破棄して再生成できる

---

## 3. Resolved の生成

Resolver は Topology を座標へ解決し、次を生成する。

- ResolvedVertex
- ResolvedEdge（length含む）
- ResolvedFace（normal/basis含む）

断面 Face（cutSurfaceFace）も通常Faceと同様に解決対象とする。

---

## 4. SnapPoint の座標解決

Resolver は SnapPointRef を座標に解決できる必要がある。

- vertex -> ResolvedVertex.position
- edge_ratio -> ResolvedEdge の内分点
- face_center -> ResolvedFace の重心（または面内代表点）

---

## 5. CutPlane の生成

CutPlane は CutInput（snapPoints）から導出される派生情報である。

- snapPoints を座標へ解決
- 3点から平面を確定（または一般化）

---

## 6. CutResult の生成

CutResult は CutPlane と Resolved から導出される。

- 交線（cutSegments）
- 面の分割ポリゴン（cutFacePolygons）
- 断面ポリゴン（cutSurfacePolygon）
- 切断後Solid（必要なら）

断面 Face を切断後Solidに含める場合、
- 断面ポリゴンの頂点列（CCW）から Face を生成し、
- Solid.faces に追加する（SSOTの生成物として確定）

---

## 7. NetDerived の生成

NetDerived は NetPlan（SSOT）と Resolved から導出される。

### 7.1 ヒンジ軸の解決
- hingeEdgeId を ResolvedEdge に解決し、
  - start, end を回転軸（線分）として扱う

### 7.2 展開姿勢の計算
- rootFace を固定基準とする
- hinges（親子）に従って子面の pose を伝播する
- faceOrder に従って段階的に pose を補間し、アニメ状態を更新する

---

## 8. Measurements の生成（任意）

- edgeLength：ResolvedEdge.length の集約
- faceArea / solidVolume：将来拡張（必要なときに導入）

---

## 9. まとめ

- Resolver は SSOT を変更せず、Derived を生成する
- Cut は snapPoints（SSOT）から平面と切断結果を導出する
- Net は NetPlan（SSOT）から展開姿勢とアニメ進捗を導出する
- 断面Faceも通常Faceと同様に解決・展開対象になり得る
