# 3D 立体切断シミュレーター: SnapPointID 仕様書

Status: Active
Summary: SnapPointID は、立方体・直方体上のすべての切断点（ユーザー選択点、交点、プリセット点）を一意に識別するためのIDです。

## 1. 概要
SnapPointID は、立方体・直方体上のすべての切断点（ユーザー選択点、交点、プリセット点）を一意に識別するためのIDです。
本仕様書は、IDの構造、命名規則、使用例、変換方法をまとめます。

---

## 2. SnapPoint の種類
- **Vertex 型**
  - 立方体の頂点そのもの
- **Edge 型**
  - 辺上の任意位置（比率 0〜1）に対応
- **Face 中心型（拡張）**
  - 面の中心点（将来拡張枠）

---

## 3. SnapPointID 命名規則

### 3.1 Vertex 型
- フォーマット: `V:<インデックス>`
- 例:
  - `V:0` → 頂点 0
  - `V:1` → 頂点 1
- 表示ラベルはユーザー設定で上書き可能。内部IDは固定。

### 3.2 Edge 型
- フォーマット: `E:<頂点1><頂点2>@<比率>`
- 例:
  - `E:01@1/2` → 0–1 辺の中点
  - `E:12@1/4` → 1–2 辺の 1/4 点
- 頂点順は固定（インデックス昇順）で一意化
- 比率は 0〜1 の有理数（分数表記）で、端点は 0/1 または 1/1

### 3.3 Face 中心型（拡張）
- フォーマット: `F:<頂点1><頂点2><頂点3><頂点4>@center`
- 例:
  - `F:0123@center` → 面 0123 の中心

---

## 4. SnapPoint オブジェクト構造

```ts
interface SnapPoint {
  id: string;                 // SnapPointID
  type: 'vertex' | 'edge' | 'face';    // 種類
  vertex?: Vertex;            // type='vertex' の場合
  edge?: Edge;                // type='edge' の場合
  ratio?: {                   // type='edge' の場合 (0〜1)
    numerator: number;
    denominator: number;
  };
  face?: Face;                // type='face' の場合
  position?: THREE.Vector3;   // 派生座標（必要時のみ算出）
}
```

- Cutter や SelectionManager はこの構造を使う
- SnapPointID から座標を算出可能（派生情報）
- 教育用ハイライト、解説生成で必須情報

---

## 5. SnapPointID 使用例

### 5.1 ユーザー選択
- 選択した点: `V:0`
- SelectionManager に SnapPointID を渡す

### 5.2 プリセット
- プリセット切断点: `[V:0, E:12@1/2, V:3]`
- PresetManager → SelectionManager → Cutter へ連携

### 5.3 交点計算
- Cutter が plane と cube edge の交点を求める
- Edge 型 SnapPointID を生成
- 交点 SnapPointID: `E:01@1/3` のように辺比率で決定

---

## 6. 教育支援との統合
- 頂点 SnapPointID → 緑色マーカー
- 辺上 SnapPointID → 黄色マーカー
- 重要辺（頻出パターン） → 太線ハイライト
- SnapPointID がすべての解説・展開図描画の基準となる

---

## 7. 変換方法

### 7.1 SnapPointID → 座標
- Vertex 型: Vertex.position を返す
- Edge 型: `v1.position.lerp(v2.position, numerator/denominator)` で座標算出

### 7.2 座標 → SnapPointID（スナップ時）
- 入力座標は UI からのみ受け取り、SnapPointID に正規化する
- 以降の処理は SnapPointID を真実として扱う

---

## 8. まとめ
- SnapPointID が構造主体設計の中心
- Cutter, SelectionManager, PresetManager は統一されたIDで処理
- 教育ツールとしてのハイライト、解説、展開図描画もIDベースで安定
