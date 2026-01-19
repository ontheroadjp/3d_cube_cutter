# 構造主体アーキテクチャ移行 作業手順書

Status: Superseded
Summary: 置き換え先: docs/technical/migration/implementationchecklist.md。

置き換え先: `docs/technical/migration/implementation_checklist.md`

本ドキュメントは、立体切断シミュレーターを
座標主導アーキテクチャから構造主体アーキテクチャへ移行するための
具体的な作業計画をまとめたものである。

## 目的

- 浮動小数誤差問題の根本解決
- 切断面形状の厳密な判定
- 面積・体積計算の実装基盤構築
- 中学受験算数向け教育ツールとしての拡張性確保

## 全体方針

- 一度に全面改修しない
- 常に動作可能な状態を保つ
- 構造を一次情報、座標を派生情報とする
- 数値計算は最終段階に限定する

## フェーズ0 前提定義

### 構造要素の定義

- Vertex（頂点）
- Edge（辺：始点VertexIDと終点VertexID）
- Face（面：EdgeIDの集合）
- SnapPoint（構造上の点）
  - 頂点または辺上
  - 辺上の場合は比率で位置を定義

## フェーズ1 構造モデル層の新設

- 構造専用ディレクトリを新設
- Vertex、Edge、Face、SnapPoint を定義
- これらのクラスは座標を一切持たない

## フェーズ2 GeometryResolver 導入

- 構造情報から座標を生成する唯一の責務を持つ
- SnapPointID から座標を算出
- 立方体サイズ変更を吸収
- 数値誤差管理を集中化

## フェーズ3 SelectionManager の構造化

- 選択点を座標ではなく SnapPointID で管理
- 描画時のみ GeometryResolver を使用
- 頂点・辺上判定を自明にする

## フェーズ4 Cutter の再設計

- 切断面を 3 つの SnapPointID の組として保持
- 平面計算は GeometryResolver 経由で実施
- Edge と Plane の交点は比率として保持

## フェーズ5 断面ポリゴン導入

- 断面を構造ポリゴンとして管理
- 頂点は EdgeID と ratio の組で表現
- 順序付き配列で保持

## フェーズ6 NetManager の刷新

- 面所属判定を構造情報から直接決定
- 距離・閾値ベース判定を廃止

## フェーズ7 Preset の構造化

- Preset を SnapPointID の集合として定義
- 座標生成ロジックを排除
- 問題構造そのものを保存可能にする

## フェーズ8 main.js の責務整理

- main.js を統括・接続専用に縮小
- 状態管理とロジックを分離
- イベント処理を明確化

## 到達目標

- 数値誤差に依存しない切断判定
- 切断面形状の完全特定
- 面積・体積の厳密計算
- 解説文の自動生成基盤完成
