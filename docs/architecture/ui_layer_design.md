# ui_layer_design.md

Status: Draft
Summary: 現行UIの構成と、Three.js描画との責務分離方針を整理する。

# UI層（React + 既存UI）設計方針

## 1. 目的
- Three.js の描画ロジックと UI 層を分離し、学習機能の拡張に耐える構造にする
- React で UI 状態を管理し、表示更新の一貫性を高める

---

## 2. 役割分担
- **Core/Engine（main.ts + JSモジュール）**
  - 立体モデル、SnapPointID、切断処理、展開図、教育メタ生成
  - UIに必要な状態/イベントを `globalThis.__engine` で公開
- **UI（React）**
  - サイドバー/パネル、設定、プリセット操作、学習UI、解説表示
  - `__engine` を通じた操作と、`__setReactMode` 等による同期
- **UIManager（legacy）**
  - Tooltip/警告表示/解説パネルのフォールバック
  - Reactが未ロード時のプリセット/ユーザープリセット表示補助

---

## 3. UI層の構成（現行）
- `index.html`
  - 固定ヘッダー（タイトル + 選択数）
  - React root: `#react-root`（解説パネル）
  - React root: `#react-side-panel-root`（サイドバー）
- `side_panel.ts`（React）
  - 左側のアイコン列 + 右のパネル（開閉アニメーション）
  - パネル内: プリセット / 学習 / 設定
- `reactApp.ts`
  - 解説パネルの表示
  - `side_panel.ts` の初期化

---

## 4. Engineとの接続
UIは `globalThis.__engine` の公開APIにのみ依存する。
詳細は `docs/architecture/engine_ui_contract.md` を参照。

---

## 5. 状態管理
- サイドバーは `useState` で管理（モード/パネル/タブ/プリセットカテゴリなど）
- Engine側の表示状態は `getDisplayState` と `setDisplayState` による同期
- 学習履歴や問題生成が増える段階で `zustand` 等を導入検討

---

## 6. テスト方針
- UIはコンポーネント単位でスナップショット/振る舞いテスト
- Engineのロジックは既存のユニットテストを維持

---

## 7. まとめ
- UIはReactで分離し、Engineは既存の構造主体ロジックを保持
- `__engine` を境界に責務を分離し、学習機能拡張に合わせて段階的に強化
