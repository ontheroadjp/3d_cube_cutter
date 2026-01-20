# implementation_checklist

Status: Legacy
Summary: 構造主体移行の旧チェックリスト（記録用）。現行の正ではない。

構造主体移行は完了済み。本チェックリストは記録用。

# 構造主体移行 実装チェックリスト

## 1. 前提
- SnapPointID は `V:0`〜`V:7` の内部IDで統一
- indexMap は固定、labelMap は表示専用

---

## 2. ファイル別チェックリスト

### 2.1 `js/Cube.ts`
- [x] Vertex/Edge/Face を構造モデルとして再定義
- [x] indexMap を固定生成し外部提供
- [x] labelMap を UI 表示専用として切り離し
- [x] `getSnapPointPosition` を GeometryResolver に移譲

### 2.2 `js/SelectionManager.ts`
- [x] 選択点を SnapPointID 配列で保持
- [x] Marker 生成は SnapPointID → GeometryResolver 経由
- [x] Edge 分割ラベルも SnapPointID ベースで計算

### 2.3 `js/Cutter.ts`
- [x] `cut` 引数を SnapPointID 配列に変更
- [x] 平面計算前に GeometryResolver で座標解決
- [x] IntersectionPoint に SnapPointID を付与

### 2.4 `js/net/NetManager.ts`
- [x] faceIds に基づく 2D 投影に変更
- [x] 距離閾値依存ロジックの削除

### 2.5 `js/presets/*` (TypeScript)
- [x] presetData を SnapPointID 配列へ変更
- [x] PresetManager は SnapPointID を SelectionManager へ渡す

### 2.6 `main.ts`
- [x] GeometryResolver を初期化
- [x] クリック時に SnapPointID を生成して SelectionManager に渡す
- [x] 旧来の座標ベース選択を廃止

---

## 3. UI/設定
- [x] 頂点ラベル設定 UI を追加
- [x] labelMap の適用と再描画を実装
- [x] モバイル簡略UIの導入（必要機能のみ）

---

## 4. テスト
- [x] SnapPointID パース/正規化
- [x] 代表パターンで切断結果一致
- [x] 展開図の面所属判定
