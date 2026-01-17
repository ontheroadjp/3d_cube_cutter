# user_preset_state_spec.md

Status: Active

# ユーザープリセット（状態保存）仕様

## 1. 目的
切断点や頂点ラベルなどの直方体状態を、
プリセットと同列の「ユーザープリセット」として保存・復元できるようにする。

---

## 2. 保存対象

- 立方体サイズ (lx, ly, lz)
- SnapPointID 配列（切断点）
- 切断反転フラグ
- 頂点ラベル設定 (labelMap)
- 表示設定（透明/面ラベル/辺ラベルモードなど）
- プリセット名、説明、カテゴリ

---

## 3. データ構造

```
interface UserPresetState {
  id: string; // UUID
  name: string;
  description?: string;
  category?: string;
  cube: {
    size: { lx: number; ly: number; lz: number };
    labelMap?: Record<string, string>; // V:0 -> 表示ラベル
  };
  cut: {
    snapPoints: string[]; // SnapPointID
    inverted: boolean;
    result?: {
      outline: string[]; // SnapPointID
      intersections: Array<{
        id: string;
        type: 'snap' | 'intersection';
        edgeId?: string;
        ratio?: { numerator: number; denominator: number };
        faceIds?: string[];
      }>;
      cutSegments: Array<{
        startId: string;
        endId: string;
        faceIds?: string[];
      }>;
    };
  };
  display: {
    showVertexLabels: boolean;
    showFaceLabels: boolean;
    edgeLabelMode: 'visible' | 'popup' | 'hidden';
    showCutSurface: boolean;
    showPyramid: boolean;
    cubeTransparent: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. 保存と復元の流れ

1. 現在状態を `UserPresetState` に変換
2. 永続化（StorageAdapter: IndexedDB / SQLite）
3. 適用時は以下順で復元
   - `cube.size` を反映
   - `cube.labelMap` を反映
   - `cut.snapPoints` を SelectionManager へ渡す
   - `cut.inverted` を反映
   - `display` を UI に反映

---

## 5. 互換性
- SnapPointID は内部ID (V:0〜V:7) を前提
- 表示ラベルは UI で変換
- 旧形式のプリセットは `snapPoints` のみを持つ簡易形式として読み込み可能

---

## 6. 将来拡張
- 展開図表示状態やカメラ位置の保存
- 問題モードやヒント表示の状態保存

---

## 7. まとめ
- 切断点だけでなく「学習状態」全体を保存する
- 既存プリセットと同列に扱い、教育的な再利用性を高める
