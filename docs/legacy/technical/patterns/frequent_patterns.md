# frequent_patterns.md

Status: Active
Summary: 頻出切断パターンを SnapPointID の例として列挙する（カタログ）。プリセット契約は specification/presets を正とする。

# 3D 立体切断シミュレーター: 典型的切断パターン一覧

## 1. 概要
本ファイルは「技術側の表現（SnapPointID/登録形式）」を正として扱う。
教育的な“見るべき線/教え方/強調方針”は `docs/education/cut_patterns.md` を参照する。
プリセットのデータ契約と適用フローは `docs/technical/specification/presets/preset_snapid_notes.md` を正とする。

---

## 2. パターン分類

### 2.1 頂点を含む単純切断（三角形切断）
- **特徴**: 立方体の3頂点を通る平面で切断
- **SnapPointID 例**
  ```ts
  [ "V:0", "V:1", "V:2" ]
  ```

### 2.2 辺上点を含む三角形切断
- **特徴**: 1頂点 + 2辺上点
- **SnapPointID 例**
  ```ts
  [ "V:0", "E:12@1/2", "E:34@1/2" ]
  ```

### 2.3 正中線切断（立方体の面対角線上）
- **特徴**: 面の対角線上に点を選ぶ
- **SnapPointID 例**
  ```ts
  [ "E:01@1/2", "E:23@1/2", "E:45@1/2" ]
  ```

### 2.4 頂点 + 辺 + 面中央の複合切断
- **特徴**: 1頂点 + 辺上1点 + 面中心
- **SnapPointID 例**
  ```ts
  [ "V:0", "E:12@1/4", "F:3452@center" ]
  ```

### 2.5 面平行切断（平行六面体切断）
- **特徴**: 立方体の面に平行な平面で切断
- **SnapPointID 例**
  ```ts
  [ "E:01@0/1", "E:12@0/1", "E:23@0/1" ]
  ```

---

## 3. References
- 教育（教え方/強調方針）: docs/education/cut_patterns.md
- 解説テンプレ（教育）: docs/education/explanation_templates.md
- 境界条件（技術）: docs/technical/architecture/edu_engine_boundary.md
- SnapPointID 仕様: docs/technical/specification/snap_point_id_spec.md
- プリセット契約（技術）: docs/technical/specification/presets/preset_snapid_notes.md

---

## 4. まとめ
- 頻出パターンの「技術表現」を SnapPointID で統一する
- 教育的な“見せ方”は education 側へ委譲し、参照で接続する
