# implementation_notes.md

Status: Draft

# 実装ノート (現行 + 構造主体移行向け)

## 1. 目的
現行実装の挙動を把握しつつ、構造主体アーキテクチャへ安全に移行するための
実践的な開発メモをまとめる。

---

## 2. 現行実装の要点

### 2.1 エントリーポイント
- `main.js` が全体の初期化とイベントを統括

### 2.2 主要クラス
- `Cube.js`: 頂点/辺/面の生成、ラベル、当たり判定
- `SelectionManager.js`: 選択点・マーカー・辺分割ラベル
- `Cutter.js`: CSG 切断と交点/輪郭線描画
- `UIManager.js`: UI 操作と表示制御
- `PresetManager.js`: プリセット適用
- `NetManager.js`: 展開図描画

### 2.3 スナップ挙動
- 頂点/辺の当たり判定メッシュに Raycast
- 辺上の座標は 1cm 単位で丸め
- 中点判定は緑マーカー

---

## 3. 構造主体移行時の注意点

- 座標計算は GeometryResolver に集約する
- SelectionManager は SnapPointID を保持するだけにする
- Cutter は SnapPointID → 座標変換を経由して切断
- NetManager は面所属を構造情報で決める
- 頂点ラベルは表示専用で、内部IDは `V:0`〜`V:7` を固定とする

---

## 4. 既存実装の移行順序
1. SnapPointID パース/正規化導入
2. GeometryResolver 実装
3. SelectionManager の ID 管理化
4. Cutter の ID 入力化
5. NetManager の構造マッピング化

---

## 5. 頂点ラベル設定の実装メモ

- UI では 8 頂点分の表示ラベルを一括設定する
- 内部は `labelMap: { \"V:0\": \"P\", ... }` 形式で保持
- 既存の SnapPointID は変更しない

---

## 5. 参考
- 旧版実装ノート: `docs/legacy/v0.0.1/implementation_notes.md`
- 旧版仕様: `docs/legacy/v0.0.1/specification.md`
