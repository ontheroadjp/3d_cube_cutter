# object_model_worklog.md

Status: Active
Summary: オブジェクトベース移行の作業履歴を記録する。

## Log Format
- Date: ISO 8601
- Summary: 作業の要点
- Notes: 課題/判断/次のアクション

---

## 2026-01-18T20:29:08+09:00
Summary:
- オブジェクトベース移行の方針を合意
- 全体モデルの最小仕様を `docs/technical/specification/object_model/object_model_spec.md` として起票

Notes:
- 既存の構造主体モデルを拡張して段階移行する
- 作業はこのログに追記し続ける

## 2026-01-18T20:34:21+09:00
Summary:
- Object Model の型定義とビルダーを追加
- 既存構造モデルからのマッピング検証テストを追加

Notes:
- 既存機能への影響を避けるため、現時点では参照のみ

## 2026-01-18T20:39:22+09:00
Summary:
- Object Model の管理クラスを追加し、DisplayState 連携の起点を作成
- マネージャーのユニットテストを追加

Notes:
- まだ描画ロジックは Model を参照しない

## 2026-01-18T20:54:19+09:00
Summary:
- 切断線の色分けを Object Model の Edge flags から参照するルートを追加
- Cut intersections を Model に反映する処理とテストを追加

Notes:
- View は最小変更で Model を参照するように段階的に移行

## 2026-01-18T21:14:50+09:00
Summary:
- Net 展開図の切断線/切断点生成を Object Model の Cut intersections 参照に切替
- Cutter の色分け描画は Object Model 由来の色を利用

Notes:
- 次は Cut points マーカーを Model 起点で描画する

## 2026-01-18T21:22:12+09:00
Summary:
- 3D 切断点マーカーの生成を Object Model の交点参照に切替
- Cutter にマーカー更新APIを追加し、View 更新を統一

Notes:
- 既存の切断処理後フローで Model -> View 更新を呼び出す

## 2026-01-18T21:25:21+09:00
Summary:
- 展開図以外の描画を ObjectModel 参照へ拡張する次フェーズ計画を作成

Notes:
- ラベル表示/透明化/切断補助表示の順で段階移行する

## 2026-01-18T21:33:11+09:00
Summary:
- ラベル表示（頂点/面/辺）の適用を ObjectModelManager 経由に切替
- DisplayState から View 更新を統一する入口を追加

Notes:
- 次は透明化/切断補助表示の Model 参照化を検討

## 2026-01-18T21:38:41+09:00
Summary:
- 透明化の適用を ObjectModelManager 経由に統一
- 表示状態と View 更新の責務を段階的に集約

Notes:
- Cutter 側の透明化は従来通り main で制御

## 2026-01-18T21:45:37+09:00
Summary:
- 切断補助表示トグルを ObjectModelManager 経由に統一
- DisplayState と Cutter 表示の適用経路を一箇所に集約

Notes:
- 次は Cut 面表示の Model 化を検討

## 2026-01-18T21:54:25+09:00
Summary:
- Cut 面表示の状態を ObjectModel の cut 領域で保持
- Cut 表示トグルは ObjectModelManager 経由で反映

Notes:
- Cutter 表示トグルの責務を段階的に Model 側へ移行中

## 2026-01-18T22:11:40+09:00
Summary:
- 切断結果（intersections/cutSegments/facePolygons/faceAdjacency）を ObjectModelManager に同期
- 展開図の参照元を ObjectModel の cut 情報に切替

Notes:
- Cutter からの同期入口を統一し、次フェーズの Net モデル化に備える

## 2026-01-18T22:33:08+09:00
Summary:
- Net 展開の状態（faces/animation）を ObjectModelManager に同期
- Cube/Cut どちらの展開図でも faceId を保持し、モデル化の足場を追加

Notes:
- まだ描画は main の状態を参照し、段階的に Model 参照へ切替予定

## 2026-01-18T22:42:51+09:00
Summary:
- Net のアニメーション更新を setNetAnimationState 経由で Model に反映
- 展開の状態遷移を Model 同期に寄せて二重管理を低減

Notes:
- 次は Net 描画の参照元を Model へ切替する

## 2026-01-18T22:49:28+09:00
Summary:
- Net 展開の state 更新を setNetAnimationState に統一
- start/clear フローの直接代入を削減

Notes:
- 次は Net 描画の参照元を Model へ切替する

## 2026-01-18T22:55:41+09:00
Summary:
- Net 展開中の表示判定を Model の state 起点に切替
- reset/applyDisplay のガード条件を Model 参照に変更

Notes:
- 次は描画系の参照元を Model へ移す

## 2026-01-18T23:02:14+09:00
Summary:
- Net 展開の progress ローカル保持を削減し、Model 参照へ寄せる
- start/clear での進捗値依存を削除

Notes:
- 次は Net の scale/position も Model 起点へ寄せる

## 2026-01-18T23:07:59+09:00
Summary:
- Net の scale/scaleTarget を Model 参照に切替し、ローカル保持を削減
- 描画側の scale 計算を Model 同期の値に合わせた

Notes:
- 次は targetCenter/positionTarget の参照も Model 起点へ寄せる

## 2026-01-18T23:12:31+09:00
Summary:
- Net の targetCenter/positionTarget を Model 参照に切替し、ローカル保持を削減
- 展開位置の参照を Model 起点に統一

Notes:
- 次は netUnfoldStart の Model 化を検討

## 2026-01-18T23:19:45+09:00
Summary:
- Net の startAt とカメラ遷移を Model に移行
- netUnfoldStart とカメラ状態のローカル保持を削除

Notes:
- 次は Net の duration/faceDuration も Model 起点へ寄せる

## 2026-01-18T23:27:18+09:00
Summary:
- Net の duration/faceDuration/stagger を Model 起点で参照
- Net アニメーション更新のガード条件を追加

Notes:
- 次は UI 側の Net 表示参照を Model に寄せる

## 2026-01-19T00:10:12+09:00
Summary:
- Net の visible を ObjectModel に追加し、UI 表示切替を Model 起点に統一
- Net の表示状態を Model 参照で管理

Notes:
- 次は UI 側で Model の visible を参照し状態反映を統一する

## 2026-01-19T00:21:48+09:00
Summary:
- Net の visible を React UI に同期し、トグルの active 表示を Model 起点で反映
- __setNetVisible を追加して UI への通知経路を統一

Notes:
- 次は Net 表示状態の UI テスト追加を検討

## 2026-01-19T08:42:25+09:00
Summary:
- PresetManager の旧 getPoints フォールバックを削除し、SnapPointID のみを前提化
- SelectionManager の交点投影フォールバックを削除し、構造化 IntersectionPoint に統一

Notes:
- プリセット仕様とサンプルを GeometryResolver 前提へ更新

## 2026-01-19T08:54:42+09:00
Summary:
- UIManager の React 設定トグル用レガシーフックを撤去

Notes:
- React 側は __setReactMode/__refreshUserPresets のみ維持

## 2026-01-19T09:02:14+09:00
Summary:
- NetManager の面同定で距離判定を撤去し、構造情報のみで決定する方式に統一

Notes:
- 複数 faceIds の場合は固定ルールで決定するよう仕様を更新

## 2026-01-19T09:11:36+09:00
Summary:
- NetManager の 2D 投影で座標フォールバックを撤去し、Resolver 依存に統一

Notes:
- Resolver で解決できない場合は描画対象から除外する

## 2026-01-19T09:15:51+09:00
Summary:
- React サイドパネル検出時は legacy UIManager のイベント連携を抑制

Notes:
- legacy DOM が無い環境でも挙動を統一できるよう整理

## 2026-01-19T09:19:57+09:00
Summary:
- ユーザープリセット操作の legacy UI 更新を React モードでは抑制

Notes:
- React UI の状態管理と重複しないように整理

## 2026-01-19T09:23:47+09:00
Summary:
- React UI 使用時は resetToFreeSelectMode の legacy 操作を抑制

Notes:
- legacy DOM を前提とした UI 更新を段階的に縮退

## 2026-01-19T10:26:30+09:00
Summary:
- SelectionManager の選択状態を SnapPointID 起点に整理し、座標保持を最小化
- 既存の同一直線チェックは必要時に Resolver から座標を解決する方式へ変更

Notes:
- 座標は派生情報として扱い、今後も保持箇所を削減していく

## 2026-01-19T11:24:43+09:00
Summary:
- 座標依存の棚卸しドキュメントを追加
- SnapPointID/Resolver 起点の移行優先度案を整理

Notes:
- Issue #9 の成果物として更新

## 2026-01-19T11:28:51+09:00
Summary:
- Object Model の座標/法線/uvBasis/長さを派生情報として明記
- Resolver 起点の生成方針をコード側に追記

Notes:
- Issue #10 の成果物として更新

## 2026-01-19T11:36:20+09:00
Summary:
- Cutter の交点/切断線を SnapPointID 起点で扱い、座標を派生情報として整理
- CutResult/Intersection 仕様に派生座標の扱いを追記

Notes:
- Issue #11 の成果物として更新

## 2026-01-19T12:19:58+09:00
Summary:
- Net 展開の切断線描画を Resolver 起点で解決するよう整理
- Net マッピング仕様に SnapPointID 正の前提を追記

Notes:
- Issue #12 の成果物として更新

## 2026-01-19T12:28:48+09:00
Summary:
- 展開図の切断面ヒンジ判定で SnapPointID 起点の座標解決に統一

Notes:
- Issue #13 の成果物として更新

## 2026-01-19T12:36:36+09:00
Summary:
- Resolver 起点のテストを追加し、座標保持削減の回帰を防止

Notes:
- Issue #14 の成果物として更新

## 2026-01-19T13:02:11+09:00
Summary:
- Model/Resolver 依存のテストを追加し、派生座標の回帰を検知

Notes:
- Issue #36 の成果物として更新

## 2026-01-19T13:12:43+09:00
Summary:
- 展開図停止の原因を特定するため、net 展開の異常値を検出・ログ化

Notes:
- Issue #43 の成果物として更新

## 2026-01-19T13:52:25+09:00
Summary:
- 展開図ボタン押下時の実行経路をログ化し、展開起点の呼び出しを確認

Notes:
- Issue #43 の成果物として更新

## 2026-01-19T13:57:34+09:00
Summary:
- prescale から opening への遷移が上書きされる問題を修正

Notes:
- Issue #43 の成果物として更新

## 2026-01-19T14:07:55+09:00
Summary:
- ラベル表示を Model の display state 参照に統一

Notes:
- Issue #37 の成果物として更新

## 2026-01-19T14:15:40+09:00
Summary:
- 立体メッシュの透明/表示切替を Model の display state 参照に統一

Notes:
- Issue #38 の成果物として更新

## 2026-01-19T14:21:30+09:00
Summary:
- Cutter 補助表示の参照元を Model の display state に統一

Notes:
- Issue #39 の成果物として更新

## 2026-01-19T14:32:22+09:00
Summary:
- Net 展開アニメの遷移パラメータを Model 起点で参照するよう統一

Notes:
- Issue #40 の成果物として更新

## 2026-01-19T14:51:50+09:00
Summary:
- 展開図の縮小が効かない問題を修正し、scaleTarget を最新の Model から取得

Notes:
- Issue #52 の成果物として更新

## 2026-01-19T09:28:53+09:00
Summary:
- UIManager の legacy DOM 参照をフラグで抑制し、React UI 前提に整理

Notes:
- React サイドパネルがある場合は legacy DOM を初期化しない

## 2026-01-19T09:30:56+09:00
Summary:
- UIManager の legacyControls 動作をテストで担保

Notes:
- legacy DOM 非依存の動作を明文化

## 2026-01-19T09:35:53+09:00
Summary:
- UIManager の legacy DOM 操作を legacyControlsEnabled で一括抑制

Notes:
- React UI 時は legacy メソッドが無操作になるよう整理

## 2026-01-19T09:47:05+09:00
Summary:
- UIManager の表示状態取得/適用を legacyControlsEnabled で分離

Notes:
- React UI 時は内部状態のみ参照し、DOMトグルを見ない

## 2026-01-19T09:51:33+09:00
Summary:
- UIManager の DOM 依存を null ガードで安全化

Notes:
- count/tooltip/alert が無い環境でも例外を出さない

## 2026-01-19T15:01:25+0900
Summary:
- ObjectModelManager が保持する切断情報から座標派生データを除去
- cutSegments と faceAdjacency を ID ベースで正規化

Notes:
- IntersectionPoint の position や sharedEdgeIds を保存せず、必要時に resolver で再計算

## 2026-01-19T15:19:45+0900
Summary:
- Cutter の cut 結果から座標保持を除去し、ID ベースへ寄せた
- 学習用の切断線も SnapPointID から都度座標解決するよう変更

Notes:
- 交点/切断線は resolver で再計算し、保持データは ID のみに統一

## 2026-01-19T15:37:41+0900
Summary:
- Net state から targetCenter/positionTarget を削除し、View 側で都度計算するよう整理

Notes:
- モデルは進行状態のみ保持し、座標派生値は保持しない

## 2026-01-19T15:45:25+0900
Summary:
- 展開図生成で cutFace.vertices 依存を避け、SnapPointID から resolver で再計算するよう整理
- CutFacePolygon に vertexIds を持たせ、ID 参照の描画経路を追加

Notes:
- vertexIds が解決できない場合は既存 vertices をフォールバック

## 2026-01-19T15:52:12+0900
Summary:
- ObjectModel の solid から派生座標（position/normal/uvBasis/length）を削除
- ObjectModelBuilder とテストを ID/構造参照のみへ更新

Notes:
- 座標派生値は resolver で都度解決する方針

## 2026-01-19T16:02:40+0900
Summary:
- CutFacePolygon の vertexIds を resolver で解決する経路を追加し、座標保持を削減
- Face adjacency を vertexIds 優先で構築するよう更新

Notes:
- vertexIds 解決失敗時は vertices をフォールバック

## 2026-01-19T17:43:00+0900
Summary:
- CutFacePolygon の vertices フォールバックを排除し、vertexIds のみを保持
- Face adjacency も vertexIds 前提に統一

Notes:
- vertexIds を解決できないポリゴンは除外し、座標保持を禁止

## 2026-01-19T17:59:48+0900
Summary:
- 切断後展開の隣接/面形状を面グラフ + 展開木で扱う設計を追記

Notes:
- 切断前/後の分岐ではなく、隣接グラフから展開木を決定する方針

## 2026-01-19T19:06:22+0900
Summary:
- CutFacePolygon を構造モデル起点で生成する方針へ移行
- CSGメッシュ座標からの逆引きを排除し、vertexIds のみで構成

Notes:
- 切断後ポリゴンの座標抽出は描画用途に限定

## 2026-01-19T19:38:22+0900
Summary:
- CSGメッシュ抽出（cutFaceExtractor）を廃止
- CutFacePolygon は構造情報のみに統一

Notes:
- 過去Issueの移行が未完了だったため再作業として実施

## 2026-01-19T19:49:16+0900
Summary:
- Cut座標派生API（getCutFacePolygon/getCutLines）を削除
- Cutter仕様から座標起点APIの記述を除去

Notes:
- CutはSnapPointIDのみを真実とする方針に統一

## 2026-01-19T20:00:54+0900
Summary:
- Cut関連の派生座標フィールドを削除（IntersectionPoint.position / CutSegment start/end / sharedEdge）
- resolver からの都度解決に統一

Notes:
- Cutの真実はSnapPointIDのみ

## 2026-01-19T20:02:36+0900
Summary:
- CutFacePolygon から座標派生フィールドを削除（vertices/normal）
- Cut/Intersection の派生座標依存を整理

Notes:
- Cutの真実はSnapPointIDのみ

## 2026-01-19T20:31:45+0900
Summary:
- SnapPoint/PlaneBuilder 仕様で座標は派生情報と明記
- ID主導の前提をドキュメントに反映

Notes:
- 実装の方針と文書の整合を再確認

## 2026-01-19T20:47:12+0900
Summary:
- CutFacePolygon の vertexIds を正規化し、面法線に合わせて winding を統一
- 共有辺判定の前処理として ID の正規化を追加

Notes:
- 面グラフ構築の前処理を強化

## 2026-01-19T20:51:56+0900
Summary:
- 面分割の検出に備えて同一平面ヒンジ情報を付与
- face adjacency に hingeType を追加

Notes:
- 面グラフ構築の前処理を拡張

## 2026-01-19T21:08:55+0900
Summary:
- 面グラフから重み付き展開木を構築し、delayIndex を木構造に合わせて再計算
- cut face を重く扱う重み付けを追加

Notes:
- 展開木に基づく順序決定の土台を用意

## 2026-01-19T21:15:55+0900
Summary:
- 展開アニメーションの順序を木構造ベースで統一
- Cube/ Cut 両方で同じ展開木計算を使用

Notes:
- delayIndex を面グラフの深さから算出

## 2026-01-19T21:30:27+0900
Summary:
- 切断後の面グラフで元面の連結性を解析し、展開木の重み付けを分岐
- cut face を必須接続として扱うケースに配慮した重み設定を追加

Notes:
- 切断前の展開処理は維持

## 2026-01-19T21:59:50+0900
Summary:
- 切断後の面同定で resolver の face 情報を基準に参照し、Front/Back の入れ替わりを防止
- 面ごとの基準平面の算出を resolver に統一

Notes:
- __DEBUG_NET_MATCH の調査結果を反映
