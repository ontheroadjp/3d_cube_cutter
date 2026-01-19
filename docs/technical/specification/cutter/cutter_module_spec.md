# Cutter モジュール仕様書

Status: Active
Summary: Cutter を構成する各モジュールの役割と責務を整理する。

Cutter を構成する各モジュールの役割と責務を整理する。

## ファイル名
docs/technical/specification/cutter/cutter_module_spec.md

## 目的
Cutter.ts / Cutter.js の機能を TypeScript に分割する際の各モジュールの責務、関数仕様、依存関係を明確化する。
構造主体アーキテクチャ（SnapPointID 管理・交点構造情報保持）に対応したモジュール設計を示す。

---

## モジュール一覧

### 1. PlaneBuilder.ts
**役割:**
- 任意の 3 点から安定した切断平面を生成する
- 浮動小数点誤差に対応した正規化・同一直線判定

**主な関数 / メソッド**
- `setFromPoints(points: SnapPoint[]): Plane | null`
    - 入力: SnapPoint 配列（3 点以上）
    - 出力: THREE.Plane オブジェクト（3 点が同一直線上の場合は null）
- `validatePlane(plane: Plane): boolean`
    - plane.normal.lengthSq() の閾値チェック、安定化処理

**依存関係**
- THREE.js
- SnapPoint インターフェース

**備考**
- 将来的に頂点・辺・面情報を含む SnapPointID と連携して、交点計算に活かす。

---

### 2. IntersectionCalculator.ts
**役割:**
- 切断平面と立方体の辺の交点を計算
- SnapPointID に基づく構造情報を保持
- 浮動小数点誤差の補正を行い、線分内判定を安定化

**主な関数 / メソッド**
- `computeEdgeIntersections(plane: Plane, cube: Cube): IntersectionPoint[]`
    - 入力: Plane, Cube
    - 出力: IntersectionPoint 配列（SnapPointID + 辺比率 + 所属面ID + 派生座標）
- `isPointOnSegment(p: Vector3, start: Vector3, end: Vector3, threshold?: number): boolean`
    - 距離ベースの線分判定（デフォルト threshold: 1e-5）

**依存関係**
- PlaneBuilder.ts
- Cube.ts（Cube.edges, Cube.vertices）

**備考**
- 交点の SnapPointID を保持することで、展開図や教育用解説への連動が容易になる。

---

### 3. CutResultBuilder.ts
**役割:**
- CSG 演算（SUBTRACTION, INTERSECTION）を実行
- 切断結果の Mesh, outline, vertexMarkers を生成
- 交点・SnapPointID に基づくマーカー色・形状を付与

**主な関数 / メソッド**
- `buildCutResult(cubeBrush: Brush, cutBrush: Brush, intersections: IntersectionPoint[], inverted: boolean): CutResult`
    - CutResult: `{ resultMesh: Mesh, removedMesh: Mesh, outline: Line, vertexMarkers: Mesh[] }`
- `applyVertexMarkers(intersections: IntersectionPoint[], scene: Scene)`
    - 緑: 元頂点
    - 黄: エッジ交点
    - 赤: 切り取られる頂点

**依存関係**
- IntersectionCalculator.ts
- PlaneBuilder.ts
- THREE.js, three-bvh-csg

**備考**
- CutResult は教育用表示と展開図作成に直接利用可能な構造情報を含む。

---

### 4. Cutter.ts (統合モジュール)
**役割:**
- PlaneBuilder, IntersectionCalculator, CutResultBuilder を統括
- 選択された SnapPointID 3 点から切断を実行
- UIManager / SelectionManager から呼び出されるエントリーポイント

**主な関数 / メソッド**
- `cut(cube: Cube, snapPoints: SnapPoint[]): boolean`
    - 処理フロー:
        1. PlaneBuilder で平面生成
        2. IntersectionCalculator で交点計算
        3. CutResultBuilder で Mesh / outline / vertexMarkers を生成
- `flipCut(): void`
    - 切断面反転処理
- `reset(): void`
    - 前回の結果 Mesh や markers を破棄

**依存関係**
- PlaneBuilder.ts
- IntersectionCalculator.ts
- CutResultBuilder.ts
- SnapPointID 管理仕様
- UIManager / SelectionManager

---

## 型・インターフェース例

    interface SnapPoint {
        id: string; // SnapPointID
        position?: THREE.Vector3; // 派生情報
        type: 'vertex' | 'edge' | 'face';
        edgeRatio?: { numerator: number; denominator: number }; // type='edge' の場合
        faceId?: string;    // 所属面ID
    }

    interface IntersectionPoint extends SnapPoint {}

    interface CutResult {
        resultMesh: THREE.Mesh;
        removedMesh: THREE.Mesh;
        outline: THREE.Line;
        vertexMarkers: THREE.Mesh[];
    }

---

## 作業上の注意点
- PlaneBuilder は常に 3 点が同一直線上でないことを保証する。
- IntersectionCalculator は SnapPointID を用いて交点の構造情報を必ず付与する。
- CutResultBuilder は教育ツール用のマーカー色分け・形状付与ロジックを保持する。
- Cutter.ts はモジュール間の依存関係を明示的に保持し、App クラスなど外部からは `cut()` と `flipCut()` のみ呼び出す設計とする。
- すべての座標計算は浮動小数点誤差対策（threshold, 正規化）を行う。

---

## モジュール依存関係図（概略）

    App / UIManager / SelectionManager
           │
           ▼
       Cutter.ts
           │
     ┌─────┴─────────────┐
     ▼                   ▼
    PlaneBuilder.ts   IntersectionCalculator.ts
                          │
                          ▼
                 CutResultBuilder.ts

---

## 備考
- この設計により、Cutter の各処理が明確な責務を持ち、テスト、教育用表示、展開図連動が容易になる。
- 今後、新しいプリセットや SnapPointID を追加する際も、IntersectionPoint を中心とした構造情報を経由すれば、既存モジュールを修正せずに対応可能。
