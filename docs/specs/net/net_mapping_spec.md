# net_mapping_spec.md

# NetManager 構造主体マッピング仕様

## 1. 目的
展開図描画を距離判定に依存せず、
Face / Edge / IntersectionPoint の構造情報から安定的に描画する。

---

## 2. 前提
- IntersectionPoint に `faceIds` が付与されている
- Face は CCW 順で頂点を保持している
- GeometryResolver が face の basisU / basisV を提供する

---

## 3. マッピング手順

1. **Face レイアウト定義**
   - `FaceLayout` に grid 座標を定義

2. **点の面所属の確定**
   - `IntersectionPoint.faceIds` を使用
   - 1 つの線分は同じ Face に属する点どうしで描画

3. **3D → 2D 変換**
   - face の `origin` を基準
   - `u = (p - origin) dot basisU / |basisU|^2`
   - `v = (p - origin) dot basisV / |basisV|^2`

4. **キャンバス座標へ配置**
   - `canvasX = offsetX + gridX * scale + u * scale`
   - `canvasY = offsetY + gridY * scale + v * scale`

---

## 4. 推奨データ構造

```
interface FaceLayout {
  faceId: string;
  grid: { x: number; y: number };
}

interface NetMappingContext {
  scale: number;
  offsetX: number;
  offsetY: number;
  layouts: FaceLayout[];
}
```

---

## 5. 禁止事項
- 平面距離の閾値判定で面所属を決めない
- `plane.distanceToPoint` を面同定に使わない

---

## 6. まとめ
- 面所属は構造情報で決める
- 2D 投影は basisU / basisV によって一貫性を保つ
- 展開図の正確性と安定性を両立する
