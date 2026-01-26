# L1_specification/animation_spec.md

# AnimationSpec Specification (L1)

本ドキュメントは、アニメーション効果（現行の展開含む）を JSON で宣言的に管理するための
AnimationSpec 仕様を定義する。
AnimationSpec は UI/演出のための仕様であり、SSOT の構造情報を変更しない。

---

## 1. 目的

- 展開（Net）などの演出を JSON で定義し、調整と再利用を容易にする
- 今後の text overlay / audio 同期の拡張に耐える最小仕様を提供する
- 実装/データ/テストで共通参照できる L1 仕様を確立する

---

## 2. 3層構造における位置づけ

- SSOT Layer: 対象外（AnimationSpec は構造の真実ではない）
- Presentation Metadata Layer: 演出の「正」として保持してよい
- Derived Layer: 再生時の補間値やキャッシュは Derived として扱う

AnimationSpec はあくまで表示・演出のための入力であり、構造整合性は SSOT が担保する。

---

## 3. スコープ / 非スコープ

### スコープ
- JSON による時間軸アニメーション定義
- 最小限の action/target/params の定義
- net 展開の再現に必要な最小セット
- text/audio の拡張余地を持つ構造

### 非スコープ（当面）
- 条件分岐やスクリプト言語的機能
- 物理演算や粒子など重い演出
- UI の具体的な操作パネル設計

---

## 4. 基本構造

```ts
type AnimationSpec = {
  id: string;
  version: number;
  timeline: AnimationStep[];
  meta?: {
    name?: string;
    description?: string;
    tags?: string[];
  };
};

type AnimationStep = {
  id?: string;
  at: number;            // 秒。0以上。
  duration: number;      // 秒。0以上。
  stagger?: number;      // 秒。target 配列の遅延間隔。
  ease?: EaseType;       // 省略時は "linear"
  action: ActionType;
  targets?: TargetRef;   // action により必須/任意が異なる
  params?: ActionParams; // action 固有
};

type EaseType =
  | "linear"
  | "easeOutCubic";
```

### 4.1 時間単位
- `at`, `duration`, `stagger` は **秒** で表現する
- `at` は 0 を基準とした時間軸

### 4.2 実行順序
- `timeline` は `at` の昇順で実行
- `at` が同一の要素は配列順で実行

---

## 5. Action と Params

Action は最小単位の演出命令であり、`params` により動作を指定する。

### 5.1 現行 net 展開向け（最小セット）

#### rotateFace
- 対象の面をヒンジ回転させる
- `targets` は `netFaces` を指定する

```ts
type RotateFaceParams = {
  faceId: string;        // FaceID
  hingeEdgeId: string;   // EdgeID
  angleRad: number;      // ラジアン
};
```

#### scaleGroup
- グループをスケールする

```ts
type ScaleGroupParams = {
  scale: number;         // 等方スケール
};
```

#### moveCamera
- カメラを移動/向き変更する

```ts
type MoveCameraParams = {
  position: { x: number; y: number; z: number };
  lookAt: { x: number; y: number; z: number };
};
```

#### setVisibility
- 表示/非表示の切り替え

```ts
type SetVisibilityParams = {
  visible: boolean;
};
```

#### highlight
- 対象を強調表示

```ts
type HighlightParams = {
  color?: string;        // 例: "#ff0000"
  opacity?: number;      // 0..1
  mode?: "pulse" | "solid";
};
```

### 5.2 将来拡張（text/audio）

#### showText / hideText
```ts
type ShowTextParams = {
  textId: string;
  content?: string;
  position?: { x: number; y: number };
  style?: Record<string, string>;
};
```

#### playSound / stopSound
```ts
type PlaySoundParams = {
  soundId: string;       // audioChannel 内の ID
  volume?: number;       // 0..1
  loop?: boolean;
};
```

---

## 6. Targets（対象の参照）

Target は「何に対して action を適用するか」を指定する。

```ts
type TargetRef =
  | { type: "netFaces"; ids: string[] }     // FaceID
  | { type: "netGroup" }                    // 展開グループ全体
  | { type: "camera" }                      // カメラ
  | { type: "htmlOverlay"; ids: string[] }  // Text overlay の ID
  | { type: "audioChannel"; ids: string[] };// 音声チャンネル ID
```

補足：
- `rotateFace` は `targets.type === "netFaces"` が必須
- `moveCamera` は `targets.type === "camera"` を想定
- `showText` / `hideText` は `htmlOverlay`
- `playSound` / `stopSound` は `audioChannel`

---

## 7. バリデーション / エラー処理

最低限の validation は以下を満たすこと。

- `id`, `version`, `timeline` は必須
- `timeline` は配列で、各要素に `at`, `duration`, `action` が必須
- `at`, `duration`, `stagger` は 0 以上
- 不明な `action` は警告ログを出し、その step をスキップする
- `action` に必要な `params` が欠落している場合はエラー扱い（警告 or throw を実装側で選択）

---

## 8. バージョン互換

- `version` は **破壊的変更** を検出するための整数
- 互換性が破れる場合は `version` をインクリメントする
- 旧バージョンを読み込む場合は変換レイヤーを設ける

---

## 9. net 展開の JSON 例（最小）

```json
{
  "id": "net-unfold-default",
  "version": 1,
  "timeline": [
    {
      "at": 0.0,
      "duration": 0.2,
      "ease": "linear",
      "action": "setVisibility",
      "targets": { "type": "netGroup" },
      "params": { "visible": true }
    },
    {
      "at": 0.2,
      "duration": 0.6,
      "ease": "easeOutCubic",
      "action": "rotateFace",
      "targets": { "type": "netFaces", "ids": ["F:0-1-5-4"] },
      "params": {
        "faceId": "F:0-1-5-4",
        "hingeEdgeId": "E:0-1",
        "angleRad": 1.57079632679
      }
    },
    {
      "at": 0.4,
      "duration": 0.6,
      "ease": "easeOutCubic",
      "action": "rotateFace",
      "targets": { "type": "netFaces", "ids": ["F:4-5-6-7"] },
      "params": {
        "faceId": "F:4-5-6-7",
        "hingeEdgeId": "E:4-5",
        "angleRad": 1.57079632679
      }
    }
  ]
}
```

補足：
- 1面ずつの展開順序は `at` と `duration` の調整で表現する
- 面ごとに異なるヒンジを使うため、`rotateFace` は面単位で分ける

---

## 10. 現行演出の棚卸し（Spike #155）

### 10.1 net 展開（main.ts / Cube.ts）
- 面の回転: `Cube.applyNetPlan()` がヒンジ軸を算出し、`progress` で回転量を補間
- カメラ移動: 展開開始/終了で `moveCamera` 相当の補間
- スケール調整: 展開後の AABB を元に `scaleTarget` を算出し、prescale/postscale を挟む
- 表示制御: net 表示の ON/OFF と face 表示の切替

### 10.2 学習モード（main.ts）
- 切断線のガイド描画: 線分を時間補間して伸ばす（duration 固定）
- マーカー/ヒント表示: 即時切替（アニメ無し）

### 10.3 サイド UI（index.html / main.ts）
- パネル開閉: CSS の transform/opacity transition
- レイアウト移動: JS で panel offset を ease 補間

---

## 11. Timeline で表現が難しい点（Spike #155）

- **事前計算依存**: net の `scaleTarget` は展開後 AABB に依存し、再生前に幾何計算が必要
- **状態遷移**: prescale/postscale のように「条件達成後に次状態へ移る」ロジックが必要
- **ジオメトリ依存**: 展開回転は dihedral angle と向き判定が必要（Resolver 参照）
- **同時進行**: カメラ・回転・スケールの並行制御を timeline で扱う必要

補足：
- AnimationSpec は **入力**であり、必要な派生計算は Player 側で行う

---

## 12. まとめ

- AnimationSpec は UI/演出のための L1 仕様であり、SSOT は変更しない
- `timeline` による宣言的なアニメーション定義を採用する
- action/targets/params を拡張可能な形で定義し、net 展開から text/audio へ拡張できる
