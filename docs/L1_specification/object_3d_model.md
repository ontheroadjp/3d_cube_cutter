# object_3d_model Specification Index

この仕様群は **object_3d_model（立体図形の構造主導モデル）** に関するものである。
UI仕様や学習モード仕様などは本仕様群の対象外であり、別仕様として分離して管理する。

本仕様群の目的は、AI駆動開発において **AIエージェントが作業前提（SSOT / ID / 派生 / Resolver）を誤解なく共有する** ことにある。

---

## 0. 読む順番（AIエージェント推奨）

1. `L1_specification/object_3d_model/00_overview.md`
2. `L1_specification/object_3d_model/01_ssot.md`
3. `L1_specification/object_3d_model/02_id.md`
4. `L1_specification/object_3d_model/03_object_model.md`
5. `L1_specification/object_3d_model/04_derived.md`
6. `L1_specification/object_3d_model/05_resolver.md`
7. `L1_specification/object_3d_model/06_constraints.md`
8. `L1_specification/object_3d_model/07_examples.md`

---

## 1. 本仕様のスコープ

- 立体図形を **構造主導（SSOT）** で扱うためのモデル仕様
- SnapPointID を中心とした「構造的な点」の参照仕様
- 切断（Cut）および展開（Net）を **入力（SSOT）と結果（派生）に分離**する仕様
- Resolver による座標解決（派生情報生成）仕様

---

## 2. 非スコープ（本仕様では扱わない）

- UI/画面設計（UI Spec）
- 学習モードの台本仕様（Lesson Spec）
- 問題JSONフォーマット（Problem Spec）
- 音声/ナレーション仕様（Narration Spec）

---

## 3. 最重要原則（要約）

- **構造（Topology / SnapPoint / CutInput / NetInput）が唯一の正（SSOT）**
- 座標・長さ・面積・体積・切断結果・展開結果は **派生情報**（再計算可能）
- epsilon 等の近似補正を前提にせず、整合性は構造で担保する

