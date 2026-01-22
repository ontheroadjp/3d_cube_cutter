# 06 Constraints (Recommended)

本ドキュメントは、object_3d_model をシンプルかつ堅牢に保つための推奨制約を定義する。
中学受験〜中学数学の範囲を安定に扱うことを優先し、必要十分な制約を置く。

---

## 1. Topology制約

- Topologyは 2-manifold を前提とする
  - 1つの辺を共有する面は最大2
- Face は単純ポリゴン（自己交差しない）
- Face は n角形を許可する（切断後に多角形になるため）

---

## 2. 操作制約

- Cut は SnapPointRef を入力として定義する
- CutResult は派生であり、SSOTではない
- NetInput（hinges）が展開の唯一の正であり、2D配置は派生である

---

## 3. 曲面の扱い

- 円柱/円錐などの曲面はコアモデルに混在させない
- 将来的に別型（CurvedSolid等）として追加する

---

## 4. 禁止事項（アンチパターン）

- Faceに隣接Face一覧を重複保持する（更新矛盾を生む）
- epsilon前提で構造整合性を維持する
- Cutの入力を THREE.Plane を正として保持する

