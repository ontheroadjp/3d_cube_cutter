# 00 Overview

本ドキュメントは object_3d_model 仕様群の概要を定義する。
object_3d_model は「現実の立体」そのものではなく、本アプリケーションにおける **学習体験を成立させるために拡張された立体モデル**である。

---

## 1. 目的

- 立体図形の操作（切断点の指定、切断、展開、求積）を **座標に依存せず**に扱えるようにする
- **構造主導（SSOT）** により、誤差・更新矛盾・複雑化を抑える
- AI駆動開発で AIエージェントが「何を正とし、何を派生とするか」を誤解しないようにする

---

## 2. 対象範囲（中学受験算数〜中学数学）

- 多面体：直方体/立方体、三角柱/四角柱、三角錐/四角錐、複合立体（積み木等）
- 切断：平面切断（3点指定、辺上点、平行切断、水平切断）
- 展開：多面体の展開（共有辺をヒンジとして回転）
- 求積：切断面の面積、切断後立体の体積など

曲面（円柱/円錐など）は将来拡張として別扱い（専用モデルまたは別型）とし、
本仕様のコアモデルには混在させない。

---

## 3. 非対象（別仕様で扱う）

- UI仕様
- 学習モード仕様
- 問題データ仕様
- 音声/ナレーション仕様

---

## 4. object_3d_model の3層構造（最重要）

object_3d_model は次の **3層構造**で構成される。
AIエージェントは、各層の意味と更新ルールを混同してはならない。

---

### 4.1 SSOT Layer（唯一の正 / 構造の真実）

SSOT Layer は **構造の真実**であり、切断・展開・求積の正しさを担保する根拠である。
SSOT を変更することは、モデルの意味そのものを変更する。

#### SSOT に含まれるもの
- Topology（構造）
  - Vertex：VertexID（内部識別のみ）
  - Edge：2頂点の組（vA, vB）
  - Face：頂点列（CCW順）
- SnapPoint（構造的な点）
  - SnapPointID / SnapPointRef
- 操作入力（構造）
  - CutInput：`snapPoints: SnapPointRef[]`
  - NetInput：`NetPlan（展開計画）`

#### SSOT に含めてはならないもの
- 座標、長さ、面積、体積、交線などの計算結果
- UI表示の都合で決まる名前や方向（上面/下面 等）

---

### 4.2 Presentation Metadata Layer（表示の真実 / 学習のためのメタ構造）

Presentation Metadata Layer は **学習体験と表示のための真実**である。
現実の立体に存在しない概念（例：LabelSlot）を含むが、本アプリケーションのドメインとして正当である。
Presentation Metadata は SSOT を変更しない。

#### Presentation Metadata に含まれるもの
- Labeling（ラベルスロットと表示名）
  - VertexNameSlot（頂点の概念名）
  - CornerLabelSlot（面の角に表示する頂点ラベル）
  - FaceLabelSlot / EdgeLabelSlot
  - 折り畳み時の CornerLabel 間引き（DedupPolicy）
- DisplayState（表示状態）
  - showVertexLabels / showFaceLabels / showMarkers 等の表示フラグ
  - edgeLabelMode（長さ表示モード）等

---

### 4.3 Derived Layer（派生情報 / 計算結果・キャッシュ）

Derived Layer は SSOT から計算される **派生情報**である。
Derived は再計算可能であり、SSOTではない。
必要であれば高速化のためにキャッシュとして保持してよいが、常に破棄して再計算できなければならない。

#### Derived に含まれるもの
- Resolved（座標解決済み）
  - position / normal / basis / length など
- CutResult（切断結果）
  - 交線、分割ポリゴン、断面ポリゴン、切断後Solid など
- Measurements（計測値）
  - 面積、体積など
- NetDerived（展開結果）
  - 展開姿勢（Face pose）、アニメ進捗など

---

## 5. 更新責務（誰が何を更新するか）

- SSOT Layer：
  - ユーザー操作・編集（例：切断点の指定、展開計画の選択/確定）
- Presentation Metadata Layer：
  - ユーザー設定・学習表現（例：頂点名変更、CornerLabelの間引き設定）
- Derived Layer：
  - Resolver が SSOT から生成・更新する（再計算可能）

---

## 6. アーキテクチャ基本方針

- SSOT と Presentation と Derived を混ぜない
- Resolver は SSOT を変更しない
- View は Derived と Presentation を参照して描画する

---

## 7. 本仕様の最重要キーワード

- SSOT（Single Source of Truth）
- Topology（Vertex / Edge / Face）
- SnapPointID（構造的な点）
- CutInput（切断入力）
- NetPlan（展開計画）
- Presentation Metadata（VertexNameSlot / CornerLabelSlot / DisplayState）
- Derived（Resolved / CutResult / Measurements / NetDerived）
- Resolver（派生情報を解決する計算層）
