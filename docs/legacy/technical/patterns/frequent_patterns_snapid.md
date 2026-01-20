# frequent_patterns_snapid.md（旧）

Status: Superseded
Summary: 置き換え先は docs/technical/patterns/frequent_patterns.md
Replaced-by: docs/technical/patterns/frequent_patterns.md

# 中学受験算数: 立体切断頻出パターン (SnapPointID付き)

## 1. 目的
本ドキュメントは、中学受験算数で頻出する立方体・直方体の切断パターンを SnapPointID 付きで整理したものです。
教育的な“見るべき線/強調/解説方針”は `docs/education/cut_patterns.md` を正とし、ここでは技術表現のみを扱います。

---

## 2. SnapPointIDルール復習

- **頂点 (Vertex)**: `V:<インデックス>`
  例: `V:0`、`V:1`、`V:7`
- **辺上点 (Edge)**: `E:<頂点1><頂点2>@<比率>`
  例: `E:01@1/2`（0–1 辺の中点）
- **面中心 (FaceCenter)**: `F:<頂点1><頂点2><頂点3><頂点4>@center`
  例: `F:0123@center`

詳細は `docs/technical/specification/snap_point_id_spec.md` を正とする。

---

## 3. 頻出パターン一覧

### 3.1 三角形切断 (頂点3つ)
- **説明**: 立方体の頂点3つを通る単純な三角形切断
- **SnapPointID**: `[V:0, V:1, V:2]`

### 3.2 三角形切断 (頂点1 + 2辺上)
- **説明**: 1頂点と2つの辺上点を通る三角形
- **SnapPointID**: `[V:0, E:12@1/2, E:34@1/2]`

### 3.3 四角形切断 (4頂点)
- **説明**: 立方体の4つの頂点を通る四角形切断
- **SnapPointID**: `[V:0, V:1, V:5, V:4]`

### 3.4 台形切断 (2頂点 + 2辺上)
- **説明**: 2頂点 + 2辺上の点による台形状切断
- **SnapPointID**: `[V:0, V:1, E:47@3/10, E:56@7/10]`

### 3.5 直角三角形切断
- **説明**: 直角を含む三角形切断
- **SnapPointID**: `[V:0, V:1, E:23@1/2]`

### 3.6 上底が面中心の四角形切断
- **説明**: 上底を面中心とする切断
- **SnapPointID**: `[F:0123@center, V:4, E:56@1/2, V:7]`

---

## 4. References
- 教育（教え方/強調方針）: docs/education/cut_patterns.md
- 境界条件（技術）: docs/technical/architecture/edu_engine_boundary.md
- SnapPointID 仕様: docs/technical/specification/snap_point_id_spec.md
