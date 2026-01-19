# coordinate_dependency_inventory.md

Status: Active
Summary: 座標依存箇所を棚卸しし、SnapPointID/Resolver 起点への移行優先度を整理する。

## 目的
- 座標を真実として保持している箇所を洗い出す
- SnapPointID/Resolver 起点へ移行する順序を明確にする
- 「常に動く状態」を維持しながら段階移行する

## 依存分類
### A. 状態として座標を保持している
- main
  - `main.ts`: 展開図生成は SnapPointID を resolver で解決し、座標保持への依存を減らす

### B. 描画時に Resolver で都度解決
- Selection/Interaction
  - `main.ts`: SnapPointID から `resolver.resolveVertex/resolveEdge/resolveSnapPoint` を使い選択座標を取得
  - `js/SelectionManager.ts`: SnapPointID から `resolveEdge/resolveSnapPoint` を使いラベル位置を計算
- Cutter
  - `js/Cutter.ts`: 交点/切断線は SnapPointID を保持し、座標は resolver で都度解決
  - `js/Cutter.ts`: CutFacePolygon は構造モデル起点で vertexIds を構成し、座標は resolver で都度解決
- Net
  - `js/net/NetManager.ts`: faceId から `resolver.resolveFace/resolveVertex` を使って投影

### C. 一時的な計算のみ（保持しない）
- `main.ts` のアニメーション補間や描画用の一時 `Vector3` 計算
- GeometryResolver 内部の算出値（都度生成）

## 影響範囲（主要ファイル）
- `main.ts`
  - 展開図生成/投影/ラベル描画で座標配列を扱う
- `js/Cutter.ts`
  - 交点/切断線の計算結果に座標が含まれる
- `js/net/NetManager.ts`
  - 面投影で Resolver を利用しつつも座標配列を扱う

## 移行優先度（提案）
1) Cut/交点/切断線の保持を SnapPointID 起点に整理
   - `IntersectionPoint.position` や `cutSegments.start/end` を派生情報へ寄せる
2) Net 展開の投影/面同定を Resolver 起点に統一
   - 面/辺の同定に座標フォールバックを持たない構成へ
3) CutFacePolygon の頂点保持を SnapPointID 起点へ移行
   - `CutFacePolygon.vertices` を削除できる状態へ寄せる

## 次のアクション
- Issue #10/#11/#12/#13 の順に詳細移行計画へ落とし込む
- 既存仕様ドキュメントの座標依存表現を整理
