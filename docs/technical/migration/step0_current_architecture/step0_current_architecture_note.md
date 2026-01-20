# step0_current_architecture

Status: Legacy
Summary: 構造主体移行の前提として、現行実装の責務とフローを整理する。

# ステップ0: 現行コードの責務整理

## 1. 目的
構造主体移行の前提として、現行実装の責務とフローを整理する。

---

## 2. 主要モジュールの責務

### main.js
- Three.js 初期化（scene/camera/renderer/controls）
- 入力イベント（click/mousemove/resize）
- 選択点の確定 → Cutter 実行

### js/Cube.js
- 直方体の頂点/辺/面ラベル生成
- 当たり判定用メッシュ生成（vertexMeshes/edgeMeshes）
- 表示設定（透明・ラベル表示）

### js/SelectionManager.js
- 選択点の管理（座標とObject参照）
- マーカーとラベルの生成
- 辺分割ラベルの表示制御

### js/Cutter.js
- 平面定義（3点から）
- CSG 実行（SUBTRACTION/INTERSECTION）
- 交点計算と切断輪郭線描画
- マーカー生成

### js/UIManager.js
- UI要素の参照とイベント登録
- モード切替、設定パネル表示制御

### js/presets/*
- presetData: 3点座標を生成
- PresetManager: SelectionManager への点追加

### js/net/NetManager.js
- 展開図描画（2D）
- 3D線分 → 面判定 → 2D投影

---

## 3. 現行フロー（自由選択）
1. Raycast で頂点/辺にスナップ
2. 辺上は距離を整数に丸め
3. 3点選択で Cutter.cut を実行
4. Cutter が平面定義 → 交点計算 → CSG

---

## 4. 移行上のリスク
- 座標依存が広範囲（Selection/Cutter/Net）
- 交点判定が距離閾値に依存
- ラベル/IDが座標と密結合

---

## 5. 移行の要点
- SnapPointID による一貫管理
- GeometryResolver に座標計算を集約
- indexMap/labelMap を分離
