# object_model_next_phase_plan.md

Status: Draft
Summary: Object Model 参照を展開図以外の描画へ段階拡張するための計画。

## 目的
- DisplayState や切断状態に依存する描画を Model 参照に統一する。
- View 側の状態分岐を減らし、再描画の起点を Model に集約する。

## 対象領域
1) ラベル表示 (頂点/面/辺)
2) 立体メッシュの表示状態 (透明/非表示)
3) Cutter の補助表示 (断面・切断線)
4) Net 展開アニメーション状態の Model 同期

## フェーズ案

### Phase A: ラベル表示の Model 参照
- DisplayState を ObjectModelManager に集約
- Cube/SelectionManager のラベル表示は ObjectModelManager 経由に一本化
- UI 変更時は Model 更新 -> View 更新の順にする
- 進捗: 実装中

### Phase B: 立体メッシュの表示状態
- `cubeTransparent` を Model に保持
- Cube/Cutter の透明化を Model から適用
 - 進捗: 実装中

### Phase C: Cutter 補助表示
- 切断面/切断線の表示切替を Model 参照に統一
- 断面ポリゴンの表示は Cut Model の flags を基準にする
- 進捗: Cut 結果（cutSegments/facePolygons）の同期まで完了

### Phase D: Net 展開アニメーション状態
- Net の faces/animation を ObjectModel に同期
- 展開図 UI の表示状態を Model 参照へ寄せる
- 進捗: state/progress/scale/position/startAt/camera/visible まで Model 起点化済み

## 検証方針
- 既存の UI トグルが同一挙動を維持すること
- 各フェーズごとにユニットテスト追加
- 変更は常に後方互換を優先する

## 関連ドキュメント
- `docs/technical/architecture/object_model_spec.md`
- `docs/technical/migration/object_model_migration_plan.md`
- `docs/technical/specification/ui/ui_spec.md`
