# implementation_checklist.md

# 構造主体移行 実装チェックリスト

## 1. 前提
- SnapPointID は `V:0`〜`V:7` の内部IDで統一
- indexMap は固定、labelMap は表示専用

---

## 2. ファイル別チェックリスト

### 2.1 `js/Cube.js`
- [ ] Vertex/Edge/Face を構造モデルとして再定義
- [ ] indexMap を固定生成し外部提供
- [ ] labelMap を UI 表示専用として切り離し
- [ ] `getSnapPointPosition` を GeometryResolver に移譲

### 2.2 `js/SelectionManager.js`
- [ ] 選択点を SnapPointID 配列で保持
- [ ] Marker 生成は SnapPointID → GeometryResolver 経由
- [ ] Edge 分割ラベルも SnapPointID ベースで計算

### 2.3 `js/Cutter.js`
- [ ] `cut` 引数を SnapPointID 配列に変更
- [ ] 平面計算前に GeometryResolver で座標解決
- [ ] IntersectionPoint に SnapPointID を付与

### 2.4 `js/NetManager.js`
- [ ] faceIds に基づく 2D 投影に変更
- [ ] 距離閾値依存ロジックの削除

### 2.5 `js/presets/*`
- [ ] presetData を SnapPointID 配列へ変更
- [ ] PresetManager は SnapPointID を SelectionManager へ渡す

### 2.6 `main.js`
- [ ] GeometryResolver を初期化
- [ ] クリック時に SnapPointID を生成して SelectionManager に渡す
- [ ] 旧来の座標ベース選択を廃止

---

## 3. UI/設定
- [ ] 頂点ラベル設定 UI を追加
- [ ] labelMap の適用と再描画を実装
- [ ] モバイル簡略UIの導入（必要機能のみ）

---

## 4. テスト
- [ ] SnapPointID パース/正規化
- [ ] 代表パターンで切断結果一致
- [ ] 展開図の面所属判定

