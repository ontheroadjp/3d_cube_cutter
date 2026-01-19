# architecture_migration_plan.md

Status: Superseded
Summary: 置き換え先は docs/technical/migration/structure_first_migration_plan.md

# 3D 立体切断シミュレーター: 構造主体アーキテクチャへの移行計画

## 1. 概要
本ドキュメントでは、現行の `3d_cube_cutter` プロジェクトを **構造主体アーキテクチャ** に移行するための具体的な作業手順とフェーズ分けを示します。

目的は次の通りです。

- SnapPointID に基づく構造的管理への移行
- 教育ツール向けの解説生成や重要辺ハイライト機能の基盤整備
- 数値誤差に依存しない安定した切断演算
- 現行コードの責務分離とモジュール化

---

## 2. フェーズ分けと作業手順

### フェーズ 1: 準備
1. 現行コードの機能確認、主要モジュールの責務整理
2. `docs/technical/architecture/design_principles.md` に基づく設計思想の理解
3. SnapPointID 命名規則を策定 (`docs/technical/specification/snap_point_id_spec.md`)

**目的:** 移行の共通理解と土台作り

---

### フェーズ 2: 構造情報モデルの実装
1. `Vertex` クラス作成
   - 座標、ラベル、ID、所属 Edge/Face リスト
2. `Edge` クラス作成
   - 端点 Vertex 参照、EdgeID、スナップポイントリスト
3. `Face` クラス作成
   - 頂点・辺の集合、面ID
4. Cube モジュールの修正
   - 現在の this.vertices / this.edges / this.faces をクラス構造に置き換え
   - スナップポイントを Edge ごとに生成、SnapPointID を割り当て
   - indexMap を固定化し、labelMap を表示専用に分離
5. GeometryResolver の導入
   - indexMap + size + axis から座標を解決
   - Selection/Cutter/Net が直接座標計算しないように統一

**目的:** 座標依存から構造主体への移行

---

### フェーズ 3: SnapPointID による選択点管理
1. `SelectionManager.js` を修正
   - 選択点は SnapPointID で管理
   - ID → 座標変換は GeometryResolver に委譲
2. マーカー生成・プレビュー表示も SnapPointID を元に決定
3. UI での座標表示は必要に応じて変換

**目的:** 選択・切断処理の基盤を構造情報に統一

---

### フェーズ 4: Cutter モジュールの改修
1. `Cutter.js` の cut メソッドを SnapPointID に対応
   - SnapPointID → THREE.Vector3 座標に変換
2. 切断面平面計算、交点生成、輪郭線生成を構造情報ベースに置き換え
3. 数値誤差による交点誤認識を最小化
4. 教育用マーカーの色分けや重要辺ハイライト機能を統合

**目的:** 安定した切断判定と教育機能の統合

---

### フェーズ 5: Preset 管理の改修
1. `PresetManager.js` と `presetData.js` を SnapPointID ベースに変更
2. 典型パターンの切断点は ID の集合として管理
3. 選択・Cutter への入力も ID で統一

**目的:** プリセット機能を構造主体設計に適合

---

### フェーズ 6: 教育支援機能の実装
1. 頻出パターンや重要な辺・頂点のハイライト表示
2. SnapPointID → 解説文章生成
3. 展開図表示も構造情報を元にマッピング
4. UI 上での学習支援（ヒント、マーカー色分け）

**目的:** 教材としての価値を高め、解説自動生成を可能にする

---

### フェーズ 7: テストと検証
1. 移行前後で切断結果の一致確認
2. SnapPointID 選択から Cutter 結果までの一貫性チェック
3. 教育機能（解説・ハイライト）の正確性確認
4. 数値誤差が影響しないか検証

**目的:** 安定性と教育的有用性の担保

---

## 3. 注意点
- 移行は段階的に実施し、既存コードの機能を保持すること
- SnapPointID で全ての座標を管理するため、ID 命名規則の遵守が必須
- UI と構造情報は疎結合にすることで、今後の拡張や教材生成に柔軟対応

---

## 4. まとめ
- 移行は **構造情報の整備 → SnapPointID 適用 → Cutter/Selection 改修 → 教育機能統合 → 検証** の順に段階的に実施
- これにより、座標依存の不安定さを排除し、教育ツールとしても一貫性のあるシステムを構築可能
