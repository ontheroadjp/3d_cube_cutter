# IntersectionCalculator モジュール仕様書

Status: Active
Summary: 切断平面と辺の交点計算を安定化する仕様を定義する。

切断平面と辺の交点計算を安定化する仕様を定義する。

## ファイル名
docs/specs/cutter/intersection_calculator_spec.md

## 目的
- 切断平面と立方体の辺の交点を計算
- 浮動小数点誤差の補正を行い、線分内判定を安定化
- SnapPointID に基づく構造情報を保持

---

## 主な関数 / メソッド

    computeEdgeIntersections(plane: THREE.Plane, cube: Cube): IntersectionPoint[]
    - 入力: Plane, Cube
    - 出力: IntersectionPoint 配列（座標 + SnapPointID + 辺比率 + 所属面ID）

    isPointOnSegment(p: THREE.Vector3, start: THREE.Vector3, end: THREE.Vector3, threshold?: number): boolean
    - 入力: 点 p、線分 start–end
    - 出力: true / false
    - 備考: 距離ベース判定で線分上かを確認。threshold デフォルト 1e-5

---

## 依存関係
- PlaneBuilder.ts
- Cube.ts（edges, vertices）
- SnapPointID 管理仕様

---

## IntersectionPoint 型例

    interface IntersectionPoint extends SnapPoint {
        edgeRatio: { numerator: number; denominator: number };  // 線分上の比率
        faceId?: string;    // 所属面ID
    }

---

## 作業上の注意
- 交点には必ず SnapPointID を付与する。
- 交点計算は float 誤差を考慮して安定化する。
- 出力の IntersectionPoint 配列は、CutResultBuilder で直接使用可能。
