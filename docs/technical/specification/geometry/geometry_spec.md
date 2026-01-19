# Geometry 仕様

Status: Active
Summary: GeometryResolver / indexMap / PlaneBuilder の仕様を統合して定義する。

## 1. 目的
- 構造モデルから派生座標を一元生成する
- 切断平面生成と indexMap の規約を明確化する

---

## 2. GeometryResolver

### 2.1 責務
- SnapPointID → 座標の解決
- Edge 長・Face 法線・Face 基底の算出
- サイズ変更への追従

### 2.2 インターフェース
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

### 2.3 座標解決式
```
pos = origin
    + axis.x * (indexMap.x * lx / 2)
    + axis.y * (indexMap.y * ly / 2)
    + axis.z * (indexMap.z * lz / 2)
```

---

## 3. indexMap

### 3.1 目的
内部ID (`V:0`〜`V:7`) を座標へ変換するための符号規約を定義する。

### 3.2 既定の配置
```
Top (y+):   4(-x,+y,+z)  5(+x,+y,+z)  6(+x,+y,-z)  7(-x,+y,-z)
Bottom (y-):0(-x,-y,+z)  1(+x,-y,+z)  2(+x,-y,-z)  3(-x,-y,-z)
```

### 3.3 型
```
interface IndexMap {
  [index: string]: { x: number; y: number; z: number };
}
```

---

## 4. PlaneBuilder

### 4.1 目的
- 3点以上の SnapPoint から切断平面を安定的に生成する
- 同一直線判定と法線の安定化を行う

### 4.2 関数
```
setFromPoints(points: SnapPoint[]): THREE.Plane | null
validatePlane(plane: THREE.Plane): boolean
```

---

## 5. まとめ
- Geometry は派生情報の生成のみを担う
- 構造が真実であり、座標は表示/入力の補助として扱う
