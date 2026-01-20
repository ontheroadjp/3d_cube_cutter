# object_model_migration_plan

Status: Active
Summary: 立体/切断/展開図の全要素をオブジェクト化するための段階的移行計画。

## 目的
- 立体・切断・展開図の状態をモデルに集約し、描画の責務を分離する。
- 切断点/切断線の追従などの機能を一貫した更新経路で実現する。

## 前提
- 既存の構造主体アーキテクチャを土台にする。
- 現行の動作を維持したまま段階移行する（破壊的変更は避ける）。

## スコープ
- 立体構成要素 (Vertex/Edge/Face)
- 切断結果 (Cut)
- 展開図 (Net)
- 表示状態 (DisplayState)

## 非スコープ
- UI大幅改修
- 物理計算や厳密な数値計算の刷新

## フェーズ

### Phase 0: 設計確定
- Object Model の仕様確定
- 既存仕様との接続点を明文化

### Phase 1: モデル導入
- Model 定義（型/インターフェース）追加
- 既存の構造データを Model にマッピング

### Phase 2: 表示/操作の一本化
- View が Model から描画する形へ移行
- DisplayState を Model と同期

### Phase 3: 切断/展開の連携
- Cut/Net の結果を Model に反映
- 追従描画の更新経路を Model へ統一

### Phase 4: 旧ロジックの整理
- 旧座標ベースの補助ロジックを段階撤去

## 受け入れ条件
- 立体/切断/展開図が同一Modelから一貫して描画される
- 表示トグルが Model の状態変更として扱える
- 切断点/切断線が 3D/展開図の双方で追従する

## リスク
- 既存の微妙なバランス（展開図アニメーション）の再現
- 表示状態が二重管理になる

## 関連ドキュメント
- `docs/technical/specification/object_model/object_model_spec.md`
- `docs/technical/specification/object_model/structure_model_spec.md`
- `docs/technical/specification/net/net_mapping_spec.md`

## 作業履歴
- 進行ログは `docs/technical/implementation/object_model_migration/object_model_migration_worklog.md` に記載する
