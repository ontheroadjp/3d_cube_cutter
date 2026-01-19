# net_mapping_spec.md

Status: Active
Summary: 構造情報から展開図を安定描画するNetManagerの仕様を定義する。

# NetManager 構造主体マッピング仕様

## 1. 目的
展開図描画を距離判定に依存せず、
Face / Edge / IntersectionPoint の構造情報から安定的に描画する。

---

## 2. 前提
- IntersectionPoint に `faceIds` が付与されている
- Face は CCW 順で頂点を保持している
- GeometryResolver が face の basisU / basisV を提供する
- 展開図描画は GeometryResolver を前提とし、座標ベースのフォールバックは使用しない
- 展開図の対象は「切断後の残立体」に含まれる面集合とする
- 切断線は `startId/endId` を正とし、座標は Resolver で都度解決する

---

## 3. マッピング手順

1. **Face レイアウト定義**
   - `FaceLayout` に grid 座標を定義

2. **点の面所属の確定**
   - `IntersectionPoint.faceIds` を使用
   - 1 つの線分は同じ Face に属する点どうしで描画
   - `faceIds` が複数ある場合は順序に依存せず、決定規則を固定する

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

interface CutSegment {
  startId: string;
  endId: string;
  faceIds?: string[];
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

---

## 7. 展開アニメーション（NetUnfold）
展開図表示時は、3D上で面を蝶番のように開き、最終的に真上視点の2D風にする。

### 7.1 手順
1. **Prescale**: 展開完了状態のバウンディングから縮尺を算出し、画面内に収まるよう縮小する。
2. **Opening**: 面を順番に開く（右 → 上 → 下 → 左 → 背面）。
3. **Postscale**: 閉じる際は最終的にスケールを1へ戻し、3D立体へ復帰。

### 7.2 カメラ
- 展開開始時にカメラは真上方向へ移動し、展開完了時は上からの俯瞰視点。
- 折り畳み完了後は元のカメラ位置/角度へアニメーション復帰。

### 7.3 可視要素
- 面ラベル/頂点ラベル/輪郭線は展開中も表示し、対応関係が分かるようにする。
- 切断線/切断点は面に追従し、立体時と同じ色/マーカー表現を維持する。
- 断面（切断面）は表示スイッチにより表示/非表示を切り替える。

### 7.4 ヒンジ判定
- 切断面の回転軸は CutSegment の `startId/endId` から Resolver で座標を解決する。

---

## 8. 画面内フィット戦略
- 展開完了時のバウンディングボックスから縮尺を決定し、サイドバー開閉後も画面内に収まるよう調整する。
- 縮小/移動はアニメーションで行い、展開と同時に発生しないようにタイミングを分離する。

---

## 9. 切断後の面構成（展開対象）
- 切断後の残立体を構成する面を展開対象とする。
- 断面は新しい面として扱い、`type: cut` のような属性で区別する。
- 共有辺（ヒンジ）を持つ面同士を隣接面として扱い、展開ツリーを構築する。
