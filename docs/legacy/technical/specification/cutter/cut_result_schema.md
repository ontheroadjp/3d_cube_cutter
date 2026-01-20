# cut_result_schema.md

Status: Superseded
Summary: 置き換え先は docs/technical/specification/cutter/cutter_spec.md
Replaced-by: docs/technical/specification/cutter/cutter_spec.md


# CutResult / IntersectionPoint データ仕様

## 1. 目的
切断処理の結果を構造情報として保持し、
展開図・教育解説・検証に再利用できる形で定義する。

---

## 2. IntersectionPoint

```
interface IntersectionPoint {
  id: string;                 // SnapPointID
  type: 'snap' | 'intersection';
  edgeId?: string;            // 交点が所属する EdgeID
  ratio?: { numerator: number; denominator: number };
  faceIds?: string[];         // 交点が属する面 (1-2 面)
  position?: THREE.Vector3;   // 描画用座標（派生情報）
}
```

- `type='snap'` は入力点そのもの
- `type='intersection'` は Edge と Plane の交点
- `position` は SnapPointID から Resolver で再計算可能な派生情報

---

## 3. CutSegment

```
interface CutSegment {
  startId: string;            // SnapPointID
  endId: string;              // SnapPointID
  faceIds?: string[];         // 共有面ID（展開図用）
  start?: THREE.Vector3;      // 描画用座標（派生情報）
  end?: THREE.Vector3;        // 描画用座標（派生情報）
}
```

---

## 4. Outline

```
interface Outline {
  points: IntersectionPoint[]; // CCW 順の閉曲線 (最後は先頭と同一でも可)
}
```

---

## 5. CutResult

```
interface CutResult {
  resultMesh: THREE.Mesh;      // 切断後の本体
  removedMesh: THREE.Mesh;     // 切り取られた部分
  outline: Outline;            // 切断面の輪郭
  intersections: IntersectionPoint[];
  cutSegments: CutSegment[];
  markers: THREE.Mesh[];       // 教育用マーカー
}
```

---

## 6. 生成ルール
- `intersections` には入力 SnapPoint も含める
- `outline.points` は平面上の角度順でソート
- `edgeId` と `ratio` は構造情報から決定

---

## 7. 利用先
- NetManager: faceIds に基づき 2D 投影
- Explanation: id と ratio に基づき説明文生成
- Verification: outline の点数と順序で形状判定

---

## 8. まとめ
- CutResult は構造情報を含む結果オブジェクト
- 交点・輪郭線は再利用可能な教育資産となる
