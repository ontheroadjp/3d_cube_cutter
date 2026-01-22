# Cutter 仕様

Status: Active
Summary: Cutter の構成、CutResult データ、交点計算、CSG出力の仕様を統合して定義する。

## 1. 目的
- 切断処理の責務とデータ構造を一つの仕様として整理する
- SnapPointID 主導で切断結果を構造化し、再利用可能にする

---

## 2. Cutter の責務
- 切断平面の生成
- 辺と平面の交点計算
- 切断結果（メッシュ/輪郭/マーカー）の生成
- CutResult を通じた展開/教育表示への連携

---

## 3. 主要データ構造

### 3.1 IntersectionPoint
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

### 3.2 CutSegment
```
interface CutSegment {
  startId: string;            // SnapPointID
  endId: string;              // SnapPointID
  faceIds?: string[];         // 共有面ID（展開図用）
  start?: THREE.Vector3;      // 描画用座標（派生情報）
  end?: THREE.Vector3;        // 描画用座標（派生情報）
}
```

### 3.3 Outline
```
interface Outline {
  points: IntersectionPoint[]; // CCW 順の閉曲線
}
```

### 3.4 CutResult
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

## 4. 処理フロー
1. SnapPointID から切断平面を生成
2. 平面と辺の交点を計算し、IntersectionPoint を構成
3. CSG によるメッシュ生成
4. CutResult を組み立てる

---

## 5. 交点計算仕様
- 線分内判定は閾値を用いて安定化
- Edge の交点は ratio（有理数）で保持
- 交点は SnapPointID を必ず付与する

---

## 6. CutResult 生成規則
- intersections には入力 SnapPoint も含める
- outline.points は平面上の角度順で整列
- faceIds / ratio は構造情報から決定

---

## 7. SnapPointID 連携
- Cutter 内部の真実は SnapPointID
- 座標は Resolver による派生値としてのみ扱う

---

## 8. モジュール関係（概略）

```
Cutter
 ├─ PlaneBuilder
 ├─ IntersectionCalculator
 └─ CutResultBuilder
```

---

## 9. 変更履歴
| 日付       | バージョン | 変更内容 |
|------------|------------|----------|
| 2026-01-17 | 1.0        | 初版作成 |
