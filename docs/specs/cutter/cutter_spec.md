# Cutter モジュール仕様書（TypeScript 移行版）

## 1. 概要

Cutter モジュールは、3D立方体の切断処理を担当するコアコンポーネントです。
本仕様書では、TypeScript 移行を前提に、責務ごとのモジュール分割、SnapPointID との連携、
教育ツールとしての表示機能を含めた設計を明文化します。

---

## 2. 責務分割（モジュール構造）

### 2.1 CutterCore.ts
- **役割**: 切断平面生成・切断側判定のコアロジック
- **入力**: `snapPointIDs: string[]`, `cube: Cube`
- **出力**: `THREE.Plane`, `targetVertices: THREE.Vector3[]`
- **主な関数**
    ```ts
    createCutPlane(snapPointIDs: string[], cube: Cube): THREE.Plane
    determineCutSide(cube: Cube, plane: THREE.Plane, invert: boolean): {targetVertices: THREE.Vector3[], normal: THREE.Vector3}
    ```

---

### 2.2 CutterCSG.ts
- **役割**: CSG演算によるメッシュ生成
- **入力**: `cubeBrush: Brush`, `cutBrush: Brush`
- **出力**: `resultMesh: Mesh`, `removedMesh: Mesh`
- **主な関数**
    ```ts
    executeCSG(cubeBrush: Brush, cutBrush: Brush): { resultMesh: Mesh; removedMesh: Mesh }
    ```

---

### 2.3 CutterIntersections.ts
- **役割**: 立方体の辺と切断平面の交点計算、輪郭線生成
- **入力**: `cube: Cube`, `plane: THREE.Plane`, `snapPoints: SnapPoint[]`
- **出力**: `intersections: IntersectionPoint[]`, `outline: Line3[]`
- **主な関数**
    ```ts
    computeIntersections(cube: Cube, plane: THREE.Plane, snapPoints: SnapPoint[]): IntersectionPoint[]
    generateOutline(intersections: IntersectionPoint[]): Line3[]
    ```

---

### 2.4 CutterMarkers.ts
- **役割**: 交点・頂点・辺中点のマーカー生成と色分け
- **入力**: `points: THREE.Vector3[]`, `type: 'original'|'intersection'|'snapPoint'`
- **出力**: `THREE.Mesh[]`（マーカー）
- **主な関数**
    ```ts
    createVertexMarker(point: THREE.Vector3, type: 'original'|'intersection'|'snapPoint'): Mesh
    ```

---

### 2.5 CutterFacade.ts
- **役割**: 外部 API 提供・各モジュールの統合
- **主な関数**
    ```ts
    cutCube(cube: Cube, snapPointIDs: string[]): void
    flipCut(): void
    reset(): void
    getIntersections(): IntersectionPoint[]
    getCutLines(): Line3[]
    ```

---

## 3. SnapPointID 連携

- Cutter 内部では座標（THREE.Vector3）ではなく **SnapPointID を基準** に処理を行う
- Cube クラスに SnapPointID → THREE.Vector3 変換関数を用意

    ```ts
    getSnapPointPosition(snapId: string): THREE.Vector3
    ```

- SnapPointID の種類
    - 頂点: `"V:0"`, `"V:1"`…
    - 辺: `"E:01@1/2"`（0–1 辺の中点）
    - 面: `"F:0123@center"`（4頂点の重心、拡張予定）

- プリセットは SnapPointID 配列で定義可能
- SelectionManager に渡す際も SnapPointID → 座標変換を行う

---

## 4. 教育ツール連携

- SnapPointID と IntersectionPoint の構造情報を利用
    - どの辺上か、どの頂点か、切断面の法線方向
- マーカー・輪郭線・色分けは CutterMarkers.ts が担当
- UIManager / NetManager と連携して解説表示可能
- 例: 頂点マーキング → 緑、交点 → 黄、解説テキスト → 赤枠

---

## 5. TypeScript 移行上の注意

- 型定義を明確にする
    - SnapPoint, IntersectionPoint, Cube, Line3
- モジュール間の依存関係を最小化
- CSG 演算は three-bvh-csg の型定義に準拠
- ユニットテストはモジュール単位で作成
- SnapPointID 依存のロジックは座標変換関数を通すことでテスト可能

---

## 6. 参考図

    ```
    CutterFacade
         │
         ├── CutterCore.ts
         ├── CutterCSG.ts
         ├── CutterIntersections.ts
         └── CutterMarkers.ts
    ```

---

## 7. 変更履歴

| 日付       | バージョン | 変更内容 |
|------------|------------|----------|
| 2026-01-17 | 1.0        | 初版作成。Cutter.js 分割構造、SnapPointID、教育機能連携を反映 |

---
