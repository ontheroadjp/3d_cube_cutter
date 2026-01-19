# CutResultBuilder モジュール仕様書

Status: Active
Summary: CSG の切断結果から CutResult を組み立てる仕様を定義する。

CSG の切断結果から CutResult を組み立てる仕様を定義する。

## ファイル名
docs/technical/specification/cutter/cut_result_builder_spec.md

## 目的
- CSG 演算を行い、切断結果を Mesh / outline / vertexMarkers として生成
- SnapPointID と交点情報に基づく教育表示（マーカー色分けなど）を実装

---

## 主な関数 / メソッド

    buildCutResult(
        cubeBrush: Brush,
        cutBrush: Brush,
        intersections: IntersectionPoint[],
        inverted: boolean
    ): CutResult
    - 入力: 立方体 Brush、切断 Brush、交点情報配列、反転フラグ
    - 出力: CutResult（Mesh / outline / vertexMarkers）
    - 備考: SUBTRACTION / INTERSECTION 演算を使用

    applyVertexMarkers(intersections: IntersectionPoint[], scene: THREE.Scene)
    - 入力: IntersectionPoint 配列、Three.js シーン
    - 処理:
        - 元頂点（緑）
        - エッジ交点（黄）
        - 切り取られる頂点（赤）
      を表示

---

## 依存関係
- IntersectionCalculator.ts
- PlaneBuilder.ts
- THREE.js / three-bvh-csg

---

## CutResult 型例

    interface CutResult {
        resultMesh: THREE.Mesh;
        removedMesh: THREE.Mesh;
        outline: THREE.Line;
        vertexMarkers: THREE.Mesh[];
    }

---

## 作業上の注意
- CutResult の構造情報を保持することで、展開図表示や教育ツールの解説生成に活用できる
- マーカーの色分け・形状付与は交点の SnapPointID に基づいて決定
- CSG 演算結果の Mesh は透明度設定や表示制御が可能
