# geometry_resolver_spec.md

Status: Superseded
Summary: 置き換え先は docs/technical/specification/geometry/geometry_spec.md


# GeometryResolver モジュール仕様書

## 1. 目的
構造モデル (Vertex/Edge/Face/SnapPoint) から座標情報を一元的に生成し、
座標依存を最小化した安定的な描画・切断計算を可能にする。

---

## 2. 責務
- SnapPointID → THREE.Vector3 の変換
- Edge 長・Face 法線・Face 基底ベクトルの算出
- 立方体サイズ変更に対する一貫した座標生成
- 数値誤差の丸め管理 (比率計算の集中化)
- SnapPointID の正規化/パースを委譲された場合に統一的に処理

---

## 3. 入出力インターフェース

```
interface GeometryResolver {
  resolveVertex(vertexId: string): THREE.Vector3;
  resolveEdge(edgeId: string): { start: THREE.Vector3; end: THREE.Vector3; length: number };
  resolveFace(faceId: string): { vertices: THREE.Vector3[]; normal: THREE.Vector3; basisU: THREE.Vector3; basisV: THREE.Vector3 };
  resolveSnapPoint(snapId: string): THREE.Vector3;
  resolveSnapPointRef(ref: SnapPointRef): THREE.Vector3;
  resolveFaceCenter(faceId: string): THREE.Vector3;
  getBasisForFace(faceId: string): { origin: THREE.Vector3; basisU: THREE.Vector3; basisV: THREE.Vector3 };
}
```

---

## 4. 依存データ
- 構造モデル (Vertex/Edge/Face)
- 立方体寸法 (lx, ly, lz)
- モデル座標系の基準 (中心原点 / 軸方向)
- SnapPointID パーサ (入力が文字列の場合)
- Vertex インデックスの配置規約 (indexMap)
- 表示ラベルの上書き設定 (labelMap)

---

## 5. 設定と入力

```
interface GeometryResolverConfig {
  size: { lx: number; ly: number; lz: number };
  origin: THREE.Vector3; // 通常は (0,0,0)
  axis: { x: THREE.Vector3; y: THREE.Vector3; z: THREE.Vector3 }; // 通常は単位ベクトル
  indexMap?: Record<string, { x: number; y: number; z: number }>;
  labelMap?: Record<string, string>; // UI表示用ラベルの上書き
}
```

- `indexMap` を指定しない場合は以下の規約をデフォルトとする。
  - `0(-x,-y,+z)`, `1(+x,-y,+z)`, `2(+x,-y,-z)`, `3(-x,-y,-z)`
  - `4(-x,+y,+z)`, `5(+x,+y,+z)`, `6(+x,+y,-z)`, `7(-x,+y,-z)`
- indexMap の仕様詳細は `docs/technical/specification/geometry/geometry_spec.md` を参照

---

## 5.1 座標解決式

```
pos = origin
    + axis.x * (indexMap.x * lx / 2)
    + axis.y * (indexMap.y * ly / 2)
    + axis.z * (indexMap.z * lz / 2)
```

---

## 5.2 責務分担
- `Cube` は `indexMap` と `size` を保持して Resolver に渡す
- `GeometryResolver` は座標計算のみを行い、構造モデルを変更しない

---

## 6. 実装指針

### 6.1 Vertex
- 立方体中心を原点とする
- 頂点インデックスから符号を決定
- UI 表示ラベルは labelMap によって別管理する
- indexMap は Cube 作成時に固定して構築し、GeometryResolver に渡す

### 6.2 Edge
- `resolveVertex` で端点を取得
- 長さと方向ベクトルを算出

### 6.3 SnapPoint
- Vertex 型: 対応 Vertex の座標
- Edge 型: `start.lerp(end, numerator/denominator)`
- Face Center 型: Face 4 頂点の平均

### 6.4 Face
- Face 頂点順から法線を算出
- `basisU` は頂点[0]→[1]
- `basisV` は法線と basisU の外積で算出
- `basisU`/`basisV` は正規化して返す

---

## 7. 例

```
resolveSnapPoint('E:01@1/2') -> (0,1 の中点座標)
resolveSnapPoint('F:0123@center') -> 面 0123 の中心座標
```

---

## 8. エラーハンドリング
- 不正な ID は例外ではなく `null` を返し、呼び出し側で警告
- 分母 0 は無効として弾く
- 不明な頂点インデックスは `null` とする

---

## 9. キャッシュ方針
- 同一 size/indexMap なら Vertex/Face はキャッシュ可能
- SnapPoint は ratio によって変わるため必要に応じてキャッシュする

---

## 10. まとめ
- GeometryResolver は座標生成の唯一の責務
- SelectionManager / Cutter / NetManager は座標を直接計算しない
- 全ての座標演算はここで統一管理する
