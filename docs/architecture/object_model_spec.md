# object_model_spec.md

Status: Draft
Summary: アプリ全体を対象に、立体・切断・展開図の要素をオブジェクトとして保持するための最小モデル仕様を定義する。

## 目的
- 立体/切断/展開図の要素を一貫したオブジェクトとして管理し、状態更新と描画を分離する。
- 対処療法的な修正を減らし、将来的な仕様追加を安全に行える基盤を作る。

## 前提
- 既存の構造主体アーキテクチャ（Vertex/Edge/Face/SnapPoint）を拡張する。
- 描画は View 層の責務とし、モデルは状態と関係性のみを持つ。
- 座標は GeometryResolver により解決される派生情報であり、移行期間は参照を容易にするため一時的に保持する。

## 派生情報の扱い
- `position` / `normal` / `uvBasis` / `length` などの幾何値は派生情報として扱う。
- 真実は SnapPointID と構造モデルに置き、派生情報は再計算可能であることを前提にする。
- 移行完了後は派生情報をモデルから除去できる状態を目指す。

## モデル構成（最小）

### Vertex
- `id`: VertexID (例: `V:0`)
- `position`: THREE.Vector3 (派生情報としてのワールド座標)
- `label`: string (表示ラベル)
- `flags`: { selected, hovered, isCutPoint, isSnapPoint }

### Edge
- `id`: EdgeID (例: `E:01`)
- `v1`, `v2`: Vertex 参照
- `faces`: FaceID[]
- `length`: number (派生情報)
- `flags`: { selected, hovered, isCutEdge, hasCutPoint, isMidpointCut }
  - `hasCutPoint` / `isMidpointCut` は切断線の色分け判定に利用

### Face
- `id`: FaceID (例: `F:0154`)
- `vertices`: Vertex[]
- `edges`: Edge[]
- `normal`: THREE.Vector3 (派生情報)
- `uvBasis`: { origin: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3 } (派生情報)
- `flags`: { selected, hovered, isCutFace, isOriginalFace }
- `polygons`: FacePolygon[] (切断後の分割面)

### Solid
- `id`: SolidID
- `vertices`, `edges`, `faces`
- `transform`
- `meta`: { size, volume, ... }

### Cut
- `plane`: THREE.Plane
- `snapPoints`: SnapPointRef[]
- `cutSegments`: SegmentRef[]
- `resultSolid` / `removedSolid`
- `cutFacePolygons`: FacePolygon[]
- `faceAdjacency`: FaceAdjacency[] (展開用の共有辺情報)
- `showCutSurface`: 断面表示の状態（DisplayState から同期）

### Net
- `rootFaceId`: FaceID
- `layout`: Pivot/Adjacency 情報
- `flattenedPolygons`: FaceID -> 2D polygon
- `animationState`: { state, progress, timings }
- `faces`: { faceId?, delayIndex }[]
- `animation`: { state, progress, duration, faceDuration, stagger, scale, scaleTarget, startAt, preScaleDelay, postScaleDelay, camera }
- `visible`: boolean (展開図UIの表示状態)

### DisplayState
- `showVertexLabels`
- `showFaceLabels`
- `edgeLabelMode`
- `showCutPoints`
- `colorizeCutLines`
- `showCutSurface`
- `showPyramid`
- `cubeTransparent`

## 役割分離
- Model: 状態/関係性/派生データの保持
- View: Model を読み取って描画するのみ
- Controller: UI入力 -> Model更新 -> View更新

## 不変条件
- ID は一意で安定（変更しない）
- Edge は常に 2 頂点を参照
- Face は循環順序を持つ
- uvBasis は Face の投影に一貫して利用する

## 既存仕様との関係
- `docs/architecture/structure_model_spec.md` を拡張する位置づけ
- `docs/specs/net/net_mapping_spec.md` にある投影/面同定ロジックを Model 側に集約する

## 次の作業
- Object Model の型定義（TypeScript）
- 既存構造モデルからのマッピング方針
- 表示トグルの Model/DisplayState 連携

## 実装シード
- `js/model/objectModel.ts`: 型定義
- `js/model/objectModelBuilder.ts`: 既存構造モデルからの構築
- `js/model/objectModelManager.ts`: Model の生成/同期と DisplayState の反映
  - 切断点/切断線の flags 更新と参照色の供給を担当
  - 交点位置の解決と View 側への提供を担当
