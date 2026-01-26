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

### 6.1 CutSide の整合（重要）
CutResult（特に facePolygons / faceAdjacency）は、**実際に保持される側**の立体構造と一致しなければならない。

- 切断で「どちら側を残すか」の決定は CSG と同じ基準に従う
- CutResult は **残す側の構造**を基準に生成する
- これにより SSOT と CutResult の不整合（展開停止・ヒンジ不一致）を防ぐ

### 6.2 Edge 交点 SnapPointID の正規化
Edge 上の交点は **Edge の向き（v0→v1）に対して一意**になるように正規化する。

- ratio は Edge の正規化方向に対する値として保持する
- 同一交点が複数 ID にならないよう、SnapPointID を正規化する
- これにより face adjacency / hinge 解析での断絶を防ぐ

### 6.3 CutFace の頂点順序（法線の向き）
CutResult から生成する面ポリゴンは **外向き法線**になるよう頂点順序を整える。

- 面の重心と立体中心から外向き方向を求める
- 法線が内向きの場合は頂点順序を反転する
- 展開時の dihedral 計算や回転方向の破綻を防ぐ

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
