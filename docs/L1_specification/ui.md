# L1_specification/ui.md

# UI Specification (Unified)

本ドキュメントは、本アプリケーションの UI 仕様を定義する。
ここでいう UI とは「ユーザー操作の提供」「表示状態の制御」「Engine（構造主導モデル）との接続契約」を含む。

本 UI 仕様は以下2つの性質を併せ持つ。

- UI Spec：画面構成・操作・モード・表示要素の仕様
- Engine UI Contract：UI ↔ Engine のインターフェース仕様（API/通知）

---

## 1. UI の目的

- 立体図形の切断・展開・学習を、直感的に操作できるUIを提供する
- 表示要素（ラベル・マーカー・断面など）をトグルし、理解を支援する
- プリセットや学習モードにより、典型ケースを簡単に再現できる
- UI と Engine の責務を分離し、拡張・置換しやすい構造にする

---

## 2. 画面構成（Layout）

UI は以下の領域で構成される。

- 3D Canvas（メイン表示）
- Header（上部バー）
- Sidebar / Panel（右または左の操作パネル）
- Floating UI（補助：トースト、ヒント、ショートカット表示など）

### 2.1 3D Canvas
- 立体の描画領域
- 回転 / ズーム / パンの操作を提供する
- クリック・ホバーなどの入力を Engine に伝える

### 2.2 Header
- 主要モード切替（例：切断 / 展開 / 学習 / 設定）
- リセット・元に戻す・表示切替などの主要操作

### 2.3 Panel（サイドパネル）
- モードに応じて内容が切り替わる
- 例：
  - Preset Panel（標準プリセット / ユーザープリセット）
  - Learning Panel（学習ステップ・解説）
  - Display Panel（表示トグル群）
  - Settings Panel（一般設定）

---

## 3. UI モード（Mode）

UI は複数のモードを持つ。モードは UI 表示と操作フローを規定する。

### 3.1 Free Mode（自由操作）
- ユーザーが任意に切断点を指定し切断できる
- 表示トグルやラベル変更が可能

### 3.2 Preset Mode（プリセット）
- 典型的な切断パターンを一覧から選び、ワンクリックで再現する
- Built-in Preset と User Preset を統一表示する

### 3.3 Net Mode（展開）
- 立体を 1面ずつパタンパタンと展開するアニメーションを行う
- 複数の展開パターン（NetPlan）を選択できる

#### 3.3.1 底面選択フロー（学習向け）
展開の理解を促すため、底面（rootFaceId）をユーザーが選択する。

1. 展開ボタンを押すと「底面選択モード」に入る  
2. 面ホバーで強調表示、クリックで底面を確定  
3. 選択面が基準面（F:0-3-2-1）の向きに合うよう、サイズを変えずに立体をアニメーション回転させる  
4. 画面内に収まるようズームを調整し、1.5秒待機する  
5. カメラ回転なしで面が順に展開する  
6. 展開完了後も斜め視点を維持する  

UI要件：
- 初期カメラは正面（F:0-4-5-1）を基準に、右15度・上10度の斜め視点とする
- 選択中は面がハイライトされる
- 取消/再選択ができる（展開前の状態に戻れる）
- 2D展開図の常時表示は行わない（必要ならオプション）

閉じる時（Net -> Close）:
1. 選択面が基準面（F:0-3-2-1）の向きに合うよう、サイズを変えずに立体をアニメーション回転させる  
2. カメラ回転なしで面が順に閉じる  
3. 初期サイズへ戻す  
4. 初期カメラ位置へ回転して戻る  

### 3.4 Learning Mode（学習）
- 問題・解説・誘導ステップを順番に提示する
- 各ステップで表示・操作が制限/誘導される場合がある

### 3.5 Settings Mode（設定）
- UI/操作/表示の一般設定を行う

---

## 4. 表示要素（Display Elements）

表示要素は UI によって制御され、Engine の SSOT を変更しない。

共通方針:
- 面の向きが分かるように、面ごとに淡色の配色を付与する
- 主光源はカメラ追従とし、視点移動でも陰影が安定して見えるようにする
- 隠れている辺は点線で表示し、立体の奥行きを把握しやすくする

### 4.1 ラベル
- 頂点ラベル表示 ON/OFF
- 面ラベル表示 ON/OFF
- 辺ラベル表示モード
  - visible / popup / hidden 等

### 4.2 マーカー
- 頂点マーカー表示 ON/OFF
- 切断点（SnapPoint）マーカー表示 ON/OFF

### 4.3 切断面（断面）
- 断面表示 ON/OFF
- 断面強調（色・透明度）は UI の裁量

### 4.4 強調表示
- 切断点が存在する辺の色分け ON/OFF
- 選択対象（頂点/辺/面/スナップ）のハイライト

---

## 5. UI State（表示状態 / 設定）

UI は表示状態を保持する。これは object_3d_model の Presentation Metadata に相当するが、
UI 側で保持してもよい（永続化する場合は User Preset に含められる）。

例：

    type DisplayState = {
      showVertexLabels: boolean
      showFaceLabels: boolean
      edgeLabelMode: "visible" | "popup" | "hidden"

      showVertexMarkers: boolean
      showSnapMarkers: boolean

      showCutSurface: boolean
      highlightCutEdges: boolean

      cubeTransparent: boolean
    }

推奨初期値（例）：
- showVertexLabels: true
- showFaceLabels: false
- showCutSurface: true
- highlightCutEdges: true

---

## 6. UI 操作（Interaction）

### 6.1 クリック選択
- 頂点選択
- 辺上の点選択（SnapPoint）
- 面選択（学習誘導や展開基準面などで利用）

### 6.2 切断点指定（Cut）
- SnapPoint を 3点指定すると切断平面が確定する
- 追加点指定（4点目以降）は無効または置換ルールに従う

### 6.3 展開操作（Net）
- 展開開始 / 停止 / リセット
- 展開パターン（NetPlan）選択
- ステップ送り（1面ずつ開く）または自動再生

### 6.4 プリセット操作（Preset）
- Built-in 適用（SnapPointIDを反映）
- User Preset 保存 / 適用 / 編集 / 削除

---

## 7. UI ↔ Engine Contract（最重要）

UI と Engine の責務分離のため、通信は契約（Contract）を通じて行う。

### 7.1 基本方針
- UI は Engine に「入力（意図）」を伝える
- Engine は UI に「状態（SSOT/Derivedの結果）」を通知する
- UI は Engine の SSOT を直接改変しない

---

## 8. Engine API（UI -> Engine）

UI から Engine へ操作を伝えるための API を定義する。
実装では `globalThis.__engine` のようなグローバルに公開してもよい。

例（概念）：

    type EngineAPI = {
      // selection
      selectVertex(vertexId: string): void
      selectSnapPoint(snapPointId: string): void
      clearSelection(): void

      // cut
      setCutSnapPoints(snapPointIds: string[]): void
      executeCut(): void
      resetCut(): void
      setCutInverted(inverted: boolean): void

      // net
      setActiveNetPlan(planId: string): void
      startUnfold(): void
      stopUnfold(): void
      resetUnfold(): void
      stepUnfold(): void

      // preset
      applyBuiltinPreset(presetId: string): void
      applyUserPreset(presetId: string): void
      saveUserPreset(state: any): void
      deleteUserPreset(presetId: string): void

      // labeling / display
      updateLabel(slotId: string, text: string): void
      updateDisplayState(next: Partial<DisplayState>): void
    }

注意：
- 実装で引数型をより厳密にしてよい（VertexID / SnapPointID 等）
- Engine の SSOT は API を通じてのみ変更する

---

## 9. Engine Event（Engine -> UI）

Engine は状態変化を UI に通知する。
UI は通知を受けて描画・パネル表示を更新する。

例（概念）：

    type EngineEvent =
      | { type: "SSOT_UPDATED"; payload: any }
      | { type: "DERIVED_UPDATED"; payload: any }
      | { type: "CUT_RESULT_UPDATED"; payload: any }
      | { type: "NET_DERIVED_UPDATED"; payload: any }
      | { type: "ERROR"; message: string }

実装方法は以下を許容する。

- subscribe / emit 方式（EventEmitter）
- callback 登録方式
- 状態ストア（状態同期）方式

---

## 10. エラーハンドリング（UI）

### 10.1 ユーザー操作エラー
- 無効な切断点
- 切断点不足（3点未満）
- 展開パターン未選択

対応：
- UI トースト表示
- 選択のガイド表示
- 操作ボタンを disabled にする

### 10.2 Engine エラー
- Resolver が座標解決できない
- Cutter が切断失敗

対応：
- エラー表示
- 可能なら復旧オプション（reset / undo）を提示

---

## 11. 非対象（本ドキュメントが扱わない範囲）

- UI の実装フレームワーク（React/Vue等）の選定
- 具体的な CSS / デザインシステム
- サウンド/ナレーションの詳細仕様
- 課金導線やユーザー管理（別仕様）

---

## 12. まとめ

- UI は表示制御と操作提供を担い、Engine は構造主導モデルの正しさを担う
- UI と Engine は明確な Contract で接続される
- 表示トグルやラベルは UI/Preset によって制御され、SSOTを汚さない
- 切断・展開・プリセット・学習モードを統合した操作体系を提供する
